"""
Train and save models for the prediction API
Saves both the Dual Threat model and the Binary model
"""

import pandas as pd
import numpy as np
import json
import joblib
from sklearn.ensemble import RandomForestClassifier
import os

# Get the directory of this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, '..', 'app', 'data', 'recruits_rows.csv')
MODELS_DIR = os.path.join(SCRIPT_DIR, 'models')

# Create models directory if it doesn't exist
os.makedirs(MODELS_DIR, exist_ok=True)

def load_and_prepare_data():
    """Load and prepare the recruit data"""
    df = pd.read_csv(DATA_PATH)

    # Parse stats from JSON
    def parse_stats(stats_str):
        try:
            return json.loads(stats_str.replace('""', '"'))
        except:
            return {}

    df['stats_parsed'] = df['stats'].apply(parse_stats)

    stat_columns = ['awareness', 'throw_power', 'short_accuracy', 'medium_accuracy',
                    'deep_accuracy', 'throw_on_run', 'under_pressure', 'break_sack',
                    'speed', 'acceleration']

    for stat in stat_columns:
        df[stat] = df['stats_parsed'].apply(lambda x: x.get(stat))

    # Clean dev trait
    df['dev_trait'] = df['ocr_dev_trait'].str.lower().str.strip()
    valid_traits = ['normal', 'impact', 'star', 'elite']
    df = df[df['dev_trait'].isin(valid_traits)]

    # Create binary target
    df['is_star_elite'] = df['dev_trait'].isin(['star', 'elite']).astype(int)

    return df, stat_columns


def train_dual_threat_model(df, stat_columns):
    """Train the Dual Threat specific model"""
    print("Training Dual Threat model...")

    # Filter to Dual Threat only
    dt_df = df[df['archetype'] == 'Dual Threat'].copy()

    # Create position feature
    dt_df['is_qb'] = (dt_df['position'] == 'QB').astype(int)

    # Create threshold-based features
    dt_df['elite_throw_power'] = (dt_df['throw_power'] >= 95).astype(int)
    dt_df['high_throw_power'] = (dt_df['throw_power'] >= 92).astype(int)
    dt_df['good_throw_power'] = (dt_df['throw_power'] >= 90).astype(int)
    dt_df['med_throw_power'] = (dt_df['throw_power'] >= 88).astype(int)
    dt_df['high_speed'] = (dt_df['speed'] >= 85).astype(int)
    dt_df['good_speed'] = (dt_df['speed'] >= 83).astype(int)
    dt_df['high_short_acc'] = (dt_df['short_accuracy'] >= 78).astype(int)
    dt_df['high_awareness'] = (dt_df['awareness'] >= 70).astype(int)

    # Gem encoding
    dt_df['gem_green'] = (dt_df['gem_color'] == 'green').astype(int)
    dt_df['gem_red'] = (dt_df['gem_color'] == 'red').astype(int)

    # Position-specific combos
    dt_df['qb_speed_power'] = ((dt_df['position'] == 'QB') & (dt_df['speed'] >= 83) & (dt_df['throw_power'] >= 90)).astype(int)
    dt_df['qb_triple_combo'] = ((dt_df['position'] == 'QB') & (dt_df['speed'] >= 83) & (dt_df['throw_power'] >= 90) & (dt_df['short_accuracy'] >= 78)).astype(int)
    dt_df['ath_power_speed'] = ((dt_df['position'] == 'ATH') & (dt_df['throw_power'] >= 88) & (dt_df['speed'] >= 85)).astype(int)

    # High stat count
    dt_df['high_stat_count'] = (
        (dt_df['throw_power'] >= 90).astype(int) +
        (dt_df['speed'] >= 82).astype(int) +
        (dt_df['short_accuracy'] >= 80).astype(int) +
        (dt_df['awareness'] >= 70).astype(int)
    )

    # Features
    engineered_features = [
        'is_qb',
        'elite_throw_power', 'high_throw_power', 'good_throw_power', 'med_throw_power',
        'high_speed', 'good_speed', 'high_short_acc', 'high_awareness',
        'gem_green', 'gem_red',
        'qb_speed_power', 'qb_triple_combo', 'ath_power_speed',
        'high_stat_count'
    ]

    features = stat_columns + ['star_rating'] + engineered_features

    X = dt_df[features].fillna(0)
    y = dt_df['is_star_elite']

    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    model.fit(X, y)

    print(f"  Trained on {len(X)} Dual Threat recruits")
    print(f"  Features: {len(features)}")

    # Save model and feature list
    model_path = os.path.join(MODELS_DIR, 'dual_threat_model.joblib')
    joblib.dump({
        'model': model,
        'features': features,
        'stat_columns': stat_columns,
        'engineered_features': engineered_features
    }, model_path)

    print(f"  Saved to {model_path}")
    return model, features


def train_binary_model(df, stat_columns):
    """Train the general binary model for non-Dual Threat archetypes"""
    print("\nTraining Binary model (all archetypes)...")

    # Use all data
    df = df.copy()

    # Gem encoding
    df['gem_green'] = (df['gem_color'] == 'green').astype(int)
    df['gem_red'] = (df['gem_color'] == 'red').astype(int)

    # Archetype dummies
    archetype_dummies = pd.get_dummies(df['archetype'], prefix='arch')
    df = pd.concat([df, archetype_dummies], axis=1)

    # Features
    features = stat_columns + ['star_rating', 'gem_green', 'gem_red'] + archetype_dummies.columns.tolist()

    X = df[features].fillna(0)
    y = df['is_star_elite']

    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    model.fit(X, y)

    print(f"  Trained on {len(X)} recruits")
    print(f"  Features: {len(features)}")

    # Save model and feature list
    model_path = os.path.join(MODELS_DIR, 'binary_model.joblib')
    joblib.dump({
        'model': model,
        'features': features,
        'stat_columns': stat_columns,
        'archetype_columns': archetype_dummies.columns.tolist()
    }, model_path)

    print(f"  Saved to {model_path}")
    return model, features


if __name__ == '__main__':
    print("=" * 60)
    print("TRAINING AND SAVING MODELS")
    print("=" * 60)

    df, stat_columns = load_and_prepare_data()
    print(f"\nLoaded {len(df)} recruits with valid dev traits")

    train_dual_threat_model(df, stat_columns)
    train_binary_model(df, stat_columns)

    print("\n" + "=" * 60)
    print("DONE! Models saved to api/models/")
    print("=" * 60)
