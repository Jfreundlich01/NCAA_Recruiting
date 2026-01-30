# NCAA Recruiting Dev Trait Predictor

Predicts the hidden "dev trait" (Normal, Impact, Star, Elite) of recruits in NCAA College Football 25/26 based on visible scouting data.

**All predictions run offline on-device** - no server required.

## Model Performance

| Model | Position | Test AUC | Dataset | Status |
|-------|----------|----------|---------|--------|
| **CB RF v5** | Cornerback | **0.818** | 501 CBs | ✅ Production |
| Dual Threat | QB | 0.808 | 161 QBs | ✅ Production |
| Binary | QB | 0.687 | 161 QBs | ✅ Production |

## CB Tier System

The CB model uses a hybrid rules + Random Forest approach. Rules handle ~70% of cases with high confidence, RF handles edge cases.

| Tier | Hit Rate | 95% CI | Description |
|------|----------|--------|-------------|
| **T1** | 95% | [83%, 99%] | Elite prospects - must recruit |
| **T2** | 63% | [46%, 77%] | Strong prospects |
| **T3** | 37% | [22%, 54%] | Average (use RF instead) |
| **T4** | 46% | [30%, 64%] | Green gem baseline |
| **AVOID** | 15% | [9%, 23%] | Red gem / Field+Slow |
| Baseline | 34% | - | Random selection |

### What Makes T1?

- Jammer or Robber ability (100% hit rate)
- Athletic Sum ≥ 372 (100% hit rate)
- Zone + COD ≥ 91 (100% hit rate)
- Zone/B&R + AGI ≥ 93 (100% hit rate)
- Athletic Sum 370-371 (93% hit rate)

### Statistical Validation

| Metric | Value |
|--------|-------|
| T1 confidence | >99.9999999% (p = 3.95e-16) |
| T1+T2 confidence | >99.9999999% (p = 2.49e-16) |
| Conservative claim | "T1+T2 gives at least 70% hit rate" |

## QB Rules (Dual Threat)

| Rule | Hit Rate |
|------|----------|
| TP ≥ 95 + Green Gem | 95% |
| TP ≥ 95 | 91% |
| Green Gem | 78% |
| Red Gem | 35% ceiling |

## Project Structure

```
NCAA_Recruiting/
├── app/                    # React Native Expo mobile app
│   ├── src/lib/
│   │   ├── predictionEngine.ts    # Rule-based logic
│   │   ├── randomForestPredictor.ts # RF model
│   │   ├── featureEngineering.ts  # Feature transforms
│   │   └── offlinePrediction.ts   # Main prediction service
│   └── assets/models/
│       └── cb_rf_trees.json       # CB RF model (100 trees)
├── analysis/               # Model analysis & planning docs
│   ├── CB_Version_5_analysis.md   # Latest CB analysis
│   ├── cb_scout_webapp_plan.md    # Web app planning
│   └── guess_my_dev_trait_product.md # Game concept
├── training/               # Model training scripts
├── supabase/               # Database & edge functions
└── api/                    # FastAPI (deprecated - offline now)
```

## Quick Start

### Mobile App

```bash
cd app
npm install
npx expo start
```

Create `app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Note: Predictions run entirely on-device. No API URL needed.

### Retrain CB Model

```bash
cd training
python train_cb_model.py
python export_rf_json.py
```

## Tech Stack

- **App**: React Native / Expo
- **ML**: Random Forest (scikit-learn → JSON → on-device)
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **OCR**: Claude Vision API (screenshot processing)

## Key Files

| File | Purpose |
|------|---------|
| `predictionEngine.ts` | Rule-based tier assignments |
| `randomForestPredictor.ts` | RF model inference |
| `cb_rf_trees.json` | Serialized RF model (100 trees) |
| `CB_Version_5_analysis.md` | Full statistical analysis |
