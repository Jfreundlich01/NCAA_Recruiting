"""
NCAA Recruiting Prediction API
FastAPI service that runs the trained models
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import joblib
import numpy as np
import os

app = FastAPI(
    title="NCAA Recruiting Prediction API",
    description="Predicts Star/Elite probability for QB/ATH recruits",
    version="1.0.0"
)

# Enable CORS for React Native app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models on startup
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')

dual_threat_data = None
binary_data = None

@app.on_event("startup")
async def load_models():
    global dual_threat_data, binary_data

    dt_path = os.path.join(MODELS_DIR, 'dual_threat_model.joblib')
    binary_path = os.path.join(MODELS_DIR, 'binary_model.joblib')

    if os.path.exists(dt_path):
        dual_threat_data = joblib.load(dt_path)
        print(f"Loaded Dual Threat model with {len(dual_threat_data['features'])} features")
    else:
        print(f"WARNING: Dual Threat model not found at {dt_path}")

    if os.path.exists(binary_path):
        binary_data = joblib.load(binary_path)
        print(f"Loaded Binary model with {len(binary_data['features'])} features")
    else:
        print(f"WARNING: Binary model not found at {binary_path}")


class RecruitStats(BaseModel):
    awareness: Optional[int] = 0
    throw_power: Optional[int] = 0
    short_accuracy: Optional[int] = 0
    medium_accuracy: Optional[int] = 0
    deep_accuracy: Optional[int] = 0
    throw_on_run: Optional[int] = 0
    under_pressure: Optional[int] = 0
    break_sack: Optional[int] = 0
    speed: Optional[int] = 0
    acceleration: Optional[int] = 0


class RecruitInput(BaseModel):
    name: str
    position: str  # 'QB' or 'ATH'
    archetype: str  # 'Dual Threat', 'Pocket Passer', 'Backfield Creator'
    star_rating: Optional[int] = 3
    gem_color: Optional[str] = None  # 'green', 'red', or None
    stats: RecruitStats


class PredictionResult(BaseModel):
    name: str
    position: str
    archetype: str
    star_elite_probability: float
    star_elite_percentage: int
    recommendation: str
    confidence: str
    ml_model: str  # Which ML model was used for prediction


class BatchPredictionRequest(BaseModel):
    recruits: List[RecruitInput]


class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResult]


def get_recommendation(prob: float, gem_color: Optional[str], archetype: str) -> str:
    """Generate a recommendation based on probability and features"""
    if gem_color == 'red':
        return "AVOID: Red gem indicates low potential"

    if prob >= 0.80:
        return "MUST RECRUIT: Very high Star/Elite probability"
    elif prob >= 0.65:
        return "STRONG RECRUIT: Good Star/Elite probability"
    elif prob >= 0.50:
        return "MODERATE: Decent chance, consider other factors"
    elif prob >= 0.35:
        return "RISKY: Below average Star/Elite probability"
    else:
        return "AVOID: Low Star/Elite probability"


def get_confidence(prob: float) -> str:
    """Get confidence level description"""
    if prob >= 0.75 or prob <= 0.25:
        return "High"
    elif prob >= 0.60 or prob <= 0.40:
        return "Medium"
    else:
        return "Low"


def predict_dual_threat(recruit: RecruitInput) -> PredictionResult:
    """Predict using the Dual Threat specific model"""
    if dual_threat_data is None:
        raise HTTPException(status_code=500, detail="Dual Threat model not loaded")

    model = dual_threat_data['model']
    features = dual_threat_data['features']
    stat_columns = dual_threat_data['stat_columns']

    # Build feature vector
    feature_values = {}

    # Raw stats
    stats_dict = recruit.stats.dict()
    for stat in stat_columns:
        feature_values[stat] = stats_dict.get(stat, 0) or 0

    # Star rating
    feature_values['star_rating'] = recruit.star_rating or 3

    # Position
    feature_values['is_qb'] = 1 if recruit.position == 'QB' else 0

    # Threshold features
    tp = feature_values['throw_power']
    spd = feature_values['speed']
    sa = feature_values['short_accuracy']
    awr = feature_values['awareness']

    feature_values['elite_throw_power'] = 1 if tp >= 95 else 0
    feature_values['high_throw_power'] = 1 if tp >= 92 else 0
    feature_values['good_throw_power'] = 1 if tp >= 90 else 0
    feature_values['med_throw_power'] = 1 if tp >= 88 else 0
    feature_values['high_speed'] = 1 if spd >= 85 else 0
    feature_values['good_speed'] = 1 if spd >= 83 else 0
    feature_values['high_short_acc'] = 1 if sa >= 78 else 0
    feature_values['high_awareness'] = 1 if awr >= 70 else 0

    # Gem encoding
    feature_values['gem_green'] = 1 if recruit.gem_color == 'green' else 0
    feature_values['gem_red'] = 1 if recruit.gem_color == 'red' else 0

    # Combo features
    is_qb = recruit.position == 'QB'
    feature_values['qb_speed_power'] = 1 if (is_qb and spd >= 83 and tp >= 90) else 0
    feature_values['qb_triple_combo'] = 1 if (is_qb and spd >= 83 and tp >= 90 and sa >= 78) else 0
    feature_values['ath_power_speed'] = 1 if (not is_qb and tp >= 88 and spd >= 85) else 0

    # High stat count
    feature_values['high_stat_count'] = (
        (1 if tp >= 90 else 0) +
        (1 if spd >= 82 else 0) +
        (1 if sa >= 80 else 0) +
        (1 if awr >= 70 else 0)
    )

    # Build feature array in correct order
    X = np.array([[feature_values.get(f, 0) for f in features]])

    # Get probability from model
    model_prob = model.predict_proba(X)[0][1]  # Probability of Star/Elite

    # Rule-based overrides for strongest predictors
    # These override the model when we have high-confidence rules from data
    rule_applied = None
    floor_prob = model_prob

    # TP >= 95 = 91% Star/Elite in training data (10/11 QB, 2/2 ATH)
    if tp >= 95:
        if recruit.gem_color == 'green':
            # TP >= 95 + Green Gem: floor at 95%
            floor_prob = max(floor_prob, 0.95)
            rule_applied = "TP>=95 + Green Gem → 95% floor"
        else:
            # TP >= 95 alone: floor at 91%
            floor_prob = max(floor_prob, 0.91)
            rule_applied = "TP>=95 → 91% floor"

    # QB triple combo (TP>=90 + SPD>=83 + SA>=78) = 87.5% in data
    elif is_qb and tp >= 90 and spd >= 83 and sa >= 78:
        if recruit.gem_color == 'green':
            floor_prob = max(floor_prob, 0.90)
            rule_applied = "QB Triple Combo + Green → 90% floor"
        else:
            floor_prob = max(floor_prob, 0.85)
            rule_applied = "QB Triple Combo → 85% floor"

    # Green gem alone = 78% in data
    elif recruit.gem_color == 'green':
        floor_prob = max(floor_prob, 0.78)
        rule_applied = "Green Gem → 78% floor"

    # Red gem penalty
    if recruit.gem_color == 'red':
        floor_prob = min(floor_prob, 0.35)
        rule_applied = "Red Gem → 35% ceiling"

    prob = floor_prob

    # Log prediction details
    print(f"\n{'='*60}")
    print(f"DUAL THREAT PREDICTION: {recruit.name}")
    print(f"{'='*60}")
    print(f"Position: {recruit.position} (is_qb={feature_values['is_qb']})")
    print(f"Star Rating: {feature_values['star_rating']} | Gem: {recruit.gem_color}")
    print(f"\nKey Stats:")
    print(f"  Throw Power: {tp} | Speed: {spd} | Short Acc: {sa} | Awareness: {awr}")
    print(f"\nThreshold Features:")
    print(f"  elite_throw_power (TP>=95): {feature_values['elite_throw_power']}")
    print(f"  high_throw_power (TP>=92):  {feature_values['high_throw_power']}")
    print(f"  high_speed (SPD>=85):       {feature_values['high_speed']}")
    print(f"  high_short_acc (SA>=78):    {feature_values['high_short_acc']}")
    print(f"  high_awareness (AWR>=70):   {feature_values['high_awareness']}")
    print(f"\nCombo Features:")
    print(f"  qb_speed_power:    {feature_values['qb_speed_power']} (QB + SPD>=83 + TP>=90)")
    print(f"  qb_triple_combo:   {feature_values['qb_triple_combo']} (QB + SPD>=83 + TP>=90 + SA>=78)")
    print(f"  ath_power_speed:   {feature_values['ath_power_speed']} (ATH + TP>=88 + SPD>=85)")
    print(f"  high_stat_count:   {feature_values['high_stat_count']}")
    print(f"\nModel Probability: {model_prob*100:.1f}%")
    if rule_applied:
        print(f"Rule Applied: {rule_applied}")
    print(f"\n>>> FINAL PREDICTION: {prob*100:.1f}% Star/Elite <<<")
    print(f"{'='*60}\n")

    return PredictionResult(
        name=recruit.name,
        position=recruit.position,
        archetype=recruit.archetype,
        star_elite_probability=round(prob, 3),
        star_elite_percentage=int(round(prob * 100)),
        recommendation=get_recommendation(prob, recruit.gem_color, recruit.archetype),
        confidence=get_confidence(prob),
        ml_model="Dual Threat Model (CV AUC: 0.808)"
    )


def predict_binary(recruit: RecruitInput) -> PredictionResult:
    """Predict using the general binary model"""
    if binary_data is None:
        raise HTTPException(status_code=500, detail="Binary model not loaded")

    model = binary_data['model']
    features = binary_data['features']
    stat_columns = binary_data['stat_columns']
    archetype_columns = binary_data['archetype_columns']

    # Build feature vector
    feature_values = {}

    # Raw stats
    stats_dict = recruit.stats.dict()
    for stat in stat_columns:
        feature_values[stat] = stats_dict.get(stat, 0) or 0

    # Star rating
    feature_values['star_rating'] = recruit.star_rating or 3

    # Gem encoding
    feature_values['gem_green'] = 1 if recruit.gem_color == 'green' else 0
    feature_values['gem_red'] = 1 if recruit.gem_color == 'red' else 0

    # Archetype one-hot encoding
    for arch_col in archetype_columns:
        arch_name = arch_col.replace('arch_', '')
        feature_values[arch_col] = 1 if recruit.archetype == arch_name else 0

    # Build feature array in correct order
    X = np.array([[feature_values.get(f, 0) for f in features]])

    # Get probability
    prob = model.predict_proba(X)[0][1]  # Probability of Star/Elite

    return PredictionResult(
        name=recruit.name,
        position=recruit.position,
        archetype=recruit.archetype,
        star_elite_probability=round(prob, 3),
        star_elite_percentage=int(round(prob * 100)),
        recommendation=get_recommendation(prob, recruit.gem_color, recruit.archetype),
        confidence=get_confidence(prob),
        ml_model="Binary Model (CV AUC: 0.687)"
    )


@app.get("/")
async def root():
    return {
        "message": "NCAA Recruiting Prediction API",
        "version": "1.0.0",
        "endpoints": {
            "/predict": "POST - Predict single recruit",
            "/predict/batch": "POST - Predict multiple recruits",
            "/health": "GET - Health check"
        }
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "models_loaded": {
            "dual_threat": dual_threat_data is not None,
            "binary": binary_data is not None
        }
    }


@app.post("/predict", response_model=PredictionResult)
async def predict_single(recruit: RecruitInput):
    """Predict Star/Elite probability for a single recruit"""
    if recruit.archetype == "Dual Threat":
        return predict_dual_threat(recruit)
    else:
        return predict_binary(recruit)


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """Predict Star/Elite probability for multiple recruits and return ranked"""
    predictions = []

    for recruit in request.recruits:
        if recruit.archetype == "Dual Threat":
            pred = predict_dual_threat(recruit)
        else:
            pred = predict_binary(recruit)
        predictions.append(pred)

    # Sort by probability (highest first)
    predictions.sort(key=lambda x: x.star_elite_probability, reverse=True)

    return BatchPredictionResponse(predictions=predictions)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
