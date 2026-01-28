"""
Train Neural Networks for TensorFlow.js export
Trains both Dual Threat and Binary models as Keras NNs
Then exports to TensorFlow.js format for React Native
"""

import pandas as pd
import numpy as np
import json
import os
import tensorflow as tf
from tensorflow import keras
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, '..', 'app', 'data', 'recruits_rows.csv')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'app', 'assets', 'models')

# Create output directories
os.makedirs(os.path.join(OUTPUT_DIR, 'dual_threat'), exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, 'binary'), exist_ok=True)


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


def engineer_dual_threat_features(df, stat_columns):
    """Create features for Dual Threat model (26 features total)"""
    features_df = pd.DataFrame()

    # Raw stats (10 features)
    for stat in stat_columns:
        features_df[stat] = df[stat].fillna(0)

    # Star rating (1 feature)
    features_df['star_rating'] = df['star_rating'].fillna(3)

    # Position (1 feature)
    features_df['is_qb'] = (df['position'] == 'QB').astype(int)

    # Threshold features (8 features)
    tp = features_df['throw_power']
    spd = features_df['speed']
    sa = features_df['short_accuracy']
    awr = features_df['awareness']

    features_df['elite_throw_power'] = (tp >= 95).astype(int)
    features_df['high_throw_power'] = (tp >= 92).astype(int)
    features_df['good_throw_power'] = (tp >= 90).astype(int)
    features_df['med_throw_power'] = (tp >= 88).astype(int)
    features_df['high_speed'] = (spd >= 85).astype(int)
    features_df['good_speed'] = (spd >= 83).astype(int)
    features_df['high_short_acc'] = (sa >= 78).astype(int)
    features_df['high_awareness'] = (awr >= 70).astype(int)

    # Gem encoding (2 features)
    features_df['gem_green'] = (df['gem_color'] == 'green').astype(int)
    features_df['gem_red'] = (df['gem_color'] == 'red').astype(int)

    # Combo features (3 features)
    is_qb = df['position'] == 'QB'
    features_df['qb_speed_power'] = ((is_qb) & (spd >= 83) & (tp >= 90)).astype(int)
    features_df['qb_triple_combo'] = ((is_qb) & (spd >= 83) & (tp >= 90) & (sa >= 78)).astype(int)
    features_df['ath_power_speed'] = ((~is_qb) & (tp >= 88) & (spd >= 85)).astype(int)

    # High stat count (1 feature)
    features_df['high_stat_count'] = (
        (tp >= 90).astype(int) +
        (spd >= 82).astype(int) +
        (sa >= 80).astype(int) +
        (awr >= 70).astype(int)
    )

    return features_df


def engineer_binary_features(df, stat_columns):
    """Create features for Binary model (~17 features)"""
    features_df = pd.DataFrame()

    # Raw stats (10 features)
    for stat in stat_columns:
        features_df[stat] = df[stat].fillna(0)

    # Star rating (1 feature)
    features_df['star_rating'] = df['star_rating'].fillna(3)

    # Gem encoding (2 features)
    features_df['gem_green'] = (df['gem_color'] == 'green').astype(int)
    features_df['gem_red'] = (df['gem_color'] == 'red').astype(int)

    # Archetype one-hot encoding (3-4 features typically)
    archetypes = df['archetype'].unique()
    for arch in archetypes:
        col_name = f'arch_{arch.replace(" ", "_").lower()}'
        features_df[col_name] = (df['archetype'] == arch).astype(int)

    return features_df


def create_dual_threat_model(input_dim):
    """Create Keras model for Dual Threat predictions"""
    model = keras.Sequential([
        keras.layers.Dense(32, activation='relu', input_shape=(input_dim,)),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(16, activation='relu'),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(1, activation='sigmoid')
    ])

    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy', keras.metrics.AUC(name='auc')]
    )

    return model


def create_binary_model(input_dim):
    """Create Keras model for Binary predictions"""
    model = keras.Sequential([
        keras.layers.Dense(24, activation='relu', input_shape=(input_dim,)),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(12, activation='relu'),
        keras.layers.Dense(1, activation='sigmoid')
    ])

    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy', keras.metrics.AUC(name='auc')]
    )

    return model


def train_and_export_dual_threat(df, stat_columns):
    """Train Dual Threat model and export to TensorFlow.js"""
    print("\n" + "="*60)
    print("TRAINING DUAL THREAT MODEL")
    print("="*60)

    # Filter to Dual Threat only
    dt_df = df[df['archetype'] == 'Dual Threat'].copy()
    print(f"Training samples: {len(dt_df)}")

    # Engineer features
    X = engineer_dual_threat_features(dt_df, stat_columns)
    y = dt_df['is_star_elite'].values

    feature_names = list(X.columns)
    print(f"Features ({len(feature_names)}): {feature_names}")

    # Normalize features
    X_array = X.values.astype(np.float32)
    X_mean = X_array.mean(axis=0)
    X_std = X_array.std(axis=0)
    X_std[X_std == 0] = 1  # Avoid division by zero
    X_normalized = (X_array - X_mean) / X_std

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_normalized, y, test_size=0.2, random_state=42, stratify=y
    )

    # Calculate class weights for imbalanced data
    n_pos = y_train.sum()
    n_neg = len(y_train) - n_pos
    class_weight = {0: 1.0, 1: n_neg / n_pos}
    print(f"Class distribution - Normal/Impact: {n_neg}, Star/Elite: {n_pos}")
    print(f"Class weights: {class_weight}")

    # Create and train model
    model = create_dual_threat_model(len(feature_names))

    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=100,
        batch_size=16,
        class_weight=class_weight,
        verbose=1,
        callbacks=[
            keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True)
        ]
    )

    # Evaluate
    y_pred_proba = model.predict(X_test).flatten()
    auc = roc_auc_score(y_test, y_pred_proba)
    print(f"\nTest AUC: {auc:.3f}")

    y_pred = (y_pred_proba >= 0.5).astype(int)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal/Impact', 'Star/Elite']))

    # Save normalization parameters
    norm_params = {
        'mean': X_mean.tolist(),
        'std': X_std.tolist(),
        'features': feature_names
    }

    norm_path = os.path.join(OUTPUT_DIR, 'dual_threat', 'normalization.json')
    with open(norm_path, 'w') as f:
        json.dump(norm_params, f, indent=2)
    print(f"Saved normalization params to {norm_path}")

    # Export to TensorFlow.js format
    try:
        import tensorflowjs as tfjs
        export_path = os.path.join(OUTPUT_DIR, 'dual_threat')
        tfjs.converters.save_keras_model(model, export_path)
        print(f"Exported TensorFlow.js model to {export_path}")
    except ImportError:
        print("WARNING: tensorflowjs not installed. Saving as Keras model only.")
        model.save(os.path.join(OUTPUT_DIR, 'dual_threat', 'model.keras'))

    return model, auc


def train_and_export_binary(df, stat_columns):
    """Train Binary model and export to TensorFlow.js"""
    print("\n" + "="*60)
    print("TRAINING BINARY MODEL")
    print("="*60)

    print(f"Training samples: {len(df)}")

    # Engineer features
    X = engineer_binary_features(df, stat_columns)
    y = df['is_star_elite'].values

    feature_names = list(X.columns)
    print(f"Features ({len(feature_names)}): {feature_names}")

    # Normalize features
    X_array = X.values.astype(np.float32)
    X_mean = X_array.mean(axis=0)
    X_std = X_array.std(axis=0)
    X_std[X_std == 0] = 1  # Avoid division by zero
    X_normalized = (X_array - X_mean) / X_std

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_normalized, y, test_size=0.2, random_state=42, stratify=y
    )

    # Calculate class weights
    n_pos = y_train.sum()
    n_neg = len(y_train) - n_pos
    class_weight = {0: 1.0, 1: n_neg / n_pos}
    print(f"Class distribution - Normal/Impact: {n_neg}, Star/Elite: {n_pos}")
    print(f"Class weights: {class_weight}")

    # Create and train model
    model = create_binary_model(len(feature_names))

    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=100,
        batch_size=16,
        class_weight=class_weight,
        verbose=1,
        callbacks=[
            keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True)
        ]
    )

    # Evaluate
    y_pred_proba = model.predict(X_test).flatten()
    auc = roc_auc_score(y_test, y_pred_proba)
    print(f"\nTest AUC: {auc:.3f}")

    y_pred = (y_pred_proba >= 0.5).astype(int)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal/Impact', 'Star/Elite']))

    # Save normalization parameters
    norm_params = {
        'mean': X_mean.tolist(),
        'std': X_std.tolist(),
        'features': feature_names
    }

    norm_path = os.path.join(OUTPUT_DIR, 'binary', 'normalization.json')
    with open(norm_path, 'w') as f:
        json.dump(norm_params, f, indent=2)
    print(f"Saved normalization params to {norm_path}")

    # Export to TensorFlow.js format
    try:
        import tensorflowjs as tfjs
        export_path = os.path.join(OUTPUT_DIR, 'binary')
        tfjs.converters.save_keras_model(model, export_path)
        print(f"Exported TensorFlow.js model to {export_path}")
    except ImportError:
        print("WARNING: tensorflowjs not installed. Saving as Keras model only.")
        model.save(os.path.join(OUTPUT_DIR, 'binary', 'model.keras'))

    return model, auc


def main():
    print("Loading data...")
    df, stat_columns = load_and_prepare_data()
    print(f"Total recruits with dev traits: {len(df)}")

    # Train both models
    dt_model, dt_auc = train_and_export_dual_threat(df, stat_columns)
    binary_model, binary_auc = train_and_export_binary(df, stat_columns)

    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"Dual Threat Model AUC: {dt_auc:.3f}")
    print(f"Binary Model AUC: {binary_auc:.3f}")
    print(f"\nModels exported to: {OUTPUT_DIR}")
    print("\nNext steps:")
    print("1. Install tensorflowjs: pip install tensorflowjs")
    print("2. Re-run if TF.js export failed")
    print("3. Copy model files to app/assets/models/")


if __name__ == "__main__":
    main()
