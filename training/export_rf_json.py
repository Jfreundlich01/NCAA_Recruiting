"""
Train Random Forest models and export to JSON for pure JS inference
"""

import pandas as pd
import numpy as np
import json
import os
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, classification_report

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, '..', 'app', 'data', 'recruits_rows.csv')
CB_DATA_PATH = os.path.join(SCRIPT_DIR, '..', 'app', 'data', 'CB_recruits_rows.csv')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'app', 'assets', 'models')

# QB stat columns
QB_STAT_COLUMNS = ['awareness', 'throw_power', 'short_accuracy', 'medium_accuracy',
                   'deep_accuracy', 'throw_on_run', 'under_pressure', 'break_sack',
                   'speed', 'acceleration']

# CB stat columns
CB_STAT_COLUMNS = ['awareness', 'speed', 'acceleration', 'change_of_direction',
                   'agility', 'man_coverage', 'zone_coverage', 'press',
                   'catching', 'tackle']


def tree_to_json(tree, feature_names):
    """Convert a sklearn DecisionTree to JSON-serializable dict"""
    tree_ = tree.tree_
    feature_name = feature_names

    def recurse(node):
        if tree_.feature[node] != -2:  # not a leaf
            return {
                "feature": int(tree_.feature[node]),
                "threshold": float(tree_.threshold[node]),
                "left": recurse(tree_.children_left[node]),
                "right": recurse(tree_.children_right[node])
            }
        else:  # leaf node
            # Get class probabilities
            value = tree_.value[node][0]
            total = value.sum()
            proba = (value / total).tolist() if total > 0 else [0.5, 0.5]
            return {
                "value": proba  # [P(class 0), P(class 1)]
            }

    return recurse(0)


def export_random_forest(model, feature_names, output_path, model_name):
    """Export Random Forest to JSON"""
    print(f"  Exporting {model_name}...")

    trees_json = []
    for i, tree in enumerate(model.estimators_):
        tree_json = tree_to_json(tree, feature_names)
        trees_json.append(tree_json)

    export_data = {
        "n_estimators": len(model.estimators_),
        "n_features": len(feature_names),
        "feature_names": feature_names,
        "trees": trees_json
    }

    with open(output_path, 'w') as f:
        json.dump(export_data, f)

    file_size = os.path.getsize(output_path) / 1024
    print(f"  Saved to {output_path} ({file_size:.1f} KB)")

    return export_data


def load_and_prepare_qb_data():
    """Load and prepare the QB recruit data"""
    df = pd.read_csv(DATA_PATH)

    def parse_stats(stats_str):
        try:
            return json.loads(stats_str.replace('""', '"'))
        except:
            return {}

    df['stats_parsed'] = df['stats'].apply(parse_stats)

    for stat in QB_STAT_COLUMNS:
        df[stat] = df['stats_parsed'].apply(lambda x: x.get(stat))

    df['dev_trait'] = df['ocr_dev_trait'].str.lower().str.strip()
    valid_traits = ['normal', 'impact', 'star', 'elite']
    df = df[df['dev_trait'].isin(valid_traits)]
    df['is_star_elite'] = df['dev_trait'].isin(['star', 'elite']).astype(int)

    return df


def load_and_prepare_cb_data():
    """Load and prepare the CB recruit data"""
    if not os.path.exists(CB_DATA_PATH):
        return None

    df = pd.read_csv(CB_DATA_PATH)

    if len(df) < 30:  # Need minimum samples for training
        print(f"  CB data has only {len(df)} samples. Need at least 30 for training.")
        return None

    def parse_stats(stats_str):
        try:
            return json.loads(stats_str.replace('""', '"'))
        except:
            return {}

    df['stats_parsed'] = df['stats'].apply(parse_stats)

    for stat in CB_STAT_COLUMNS:
        df[stat] = df['stats_parsed'].apply(lambda x: x.get(stat))

    df['dev_trait'] = df['ocr_dev_trait'].str.lower().str.strip()
    valid_traits = ['normal', 'impact', 'star', 'elite']
    df = df[df['dev_trait'].isin(valid_traits)]
    df['is_star_elite'] = df['dev_trait'].isin(['star', 'elite']).astype(int)

    return df


def engineer_dual_threat_features(df):
    """Create features for Dual Threat model (26 features)"""
    features_df = pd.DataFrame()

    # Raw stats (10)
    for stat in QB_STAT_COLUMNS:
        features_df[stat] = df[stat].fillna(0)

    # Star rating (1)
    features_df['star_rating'] = df['star_rating'].fillna(3)

    # Position (1)
    features_df['is_qb'] = (df['position'] == 'QB').astype(int)

    # Thresholds (8)
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

    # Gems (2)
    features_df['gem_green'] = (df['gem_color'] == 'green').astype(int)
    features_df['gem_red'] = (df['gem_color'] == 'red').astype(int)

    # Combos (3)
    is_qb = df['position'] == 'QB'
    features_df['qb_speed_power'] = ((is_qb) & (spd >= 83) & (tp >= 90)).astype(int)
    features_df['qb_triple_combo'] = ((is_qb) & (spd >= 83) & (tp >= 90) & (sa >= 78)).astype(int)
    features_df['ath_power_speed'] = ((~is_qb) & (tp >= 88) & (spd >= 85)).astype(int)

    # High stat count (1)
    features_df['high_stat_count'] = (
        (tp >= 90).astype(int) +
        (spd >= 82).astype(int) +
        (sa >= 80).astype(int) +
        (awr >= 70).astype(int)
    )

    return features_df


def engineer_binary_features(df):
    """Create features for Binary model"""
    features_df = pd.DataFrame()

    # Raw stats (10)
    for stat in QB_STAT_COLUMNS:
        features_df[stat] = df[stat].fillna(0)

    # Star rating (1)
    features_df['star_rating'] = df['star_rating'].fillna(3)

    # Gems (2)
    features_df['gem_green'] = (df['gem_color'] == 'green').astype(int)
    features_df['gem_red'] = (df['gem_color'] == 'red').astype(int)

    # Archetype encoding
    archetypes = ['Pocket Passer', 'Backfield Creator', 'Dual Threat', 'Pure Runner']
    for arch in archetypes:
        col_name = f'arch_{arch.replace(" ", "_").lower()}'
        features_df[col_name] = (df['archetype'] == arch).astype(int)

    return features_df


def train_and_export_dual_threat(df):
    """Train Dual Threat RF and export to JSON"""
    print("\n" + "=" * 60)
    print("DUAL THREAT RANDOM FOREST")
    print("=" * 60)

    dt_df = df[df['archetype'] == 'Dual Threat'].copy()
    print(f"Training samples: {len(dt_df)}")

    X = engineer_dual_threat_features(dt_df)
    y = dt_df['is_star_elite'].values
    feature_names = list(X.columns)

    print(f"Features ({len(feature_names)}): {feature_names}")

    X_train, X_test, y_train, y_test = train_test_split(
        X.values, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train RF
    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_pred_proba)
    print(f"\nTest AUC: {auc:.3f}")

    # Cross-validation
    cv_auc = cross_val_score(model, X.values, y, cv=5, scoring='roc_auc')
    print(f"CV AUC: {cv_auc.mean():.3f} (+/- {cv_auc.std()*2:.3f})")

    y_pred = (y_pred_proba >= 0.5).astype(int)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal/Impact', 'Star/Elite']))

    # Export to JSON
    output_path = os.path.join(OUTPUT_DIR, 'dual_threat', 'rf_model.json')
    export_random_forest(model, feature_names, output_path, "Dual Threat RF")

    return model, auc, cv_auc.mean()


def train_and_export_binary(df):
    """Train Binary RF and export to JSON"""
    print("\n" + "=" * 60)
    print("BINARY RANDOM FOREST")
    print("=" * 60)

    print(f"Training samples: {len(df)}")

    X = engineer_binary_features(df)
    y = df['is_star_elite'].values
    feature_names = list(X.columns)

    print(f"Features ({len(feature_names)}): {feature_names}")

    X_train, X_test, y_train, y_test = train_test_split(
        X.values, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train RF
    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_pred_proba)
    print(f"\nTest AUC: {auc:.3f}")

    cv_auc = cross_val_score(model, X.values, y, cv=5, scoring='roc_auc')
    print(f"CV AUC: {cv_auc.mean():.3f} (+/- {cv_auc.std()*2:.3f})")

    y_pred = (y_pred_proba >= 0.5).astype(int)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal/Impact', 'Star/Elite']))

    # Export to JSON
    output_path = os.path.join(OUTPUT_DIR, 'binary', 'rf_model.json')
    export_random_forest(model, feature_names, output_path, "Binary RF")

    return model, auc, cv_auc.mean()


def engineer_cb_features(df):
    """Create features for CB model (31 features)
    10 raw stats + star_rating + 2 gem + 4 archetype + 14 engineered
    """
    features_df = pd.DataFrame()

    # Raw stats (10)
    for stat in CB_STAT_COLUMNS:
        features_df[stat] = df[stat].fillna(0)

    # Star rating (1)
    features_df['star_rating'] = df['star_rating'].fillna(3)

    # Gems (2)
    features_df['gem_green'] = (df['gem_color'] == 'green').astype(int)
    features_df['gem_red'] = (df['gem_color'] == 'red').astype(int)

    # Archetype encoding (4)
    archetypes = ['Boundary', 'Bump and Run', 'Field', 'Zone']
    for arch in archetypes:
        col_name = f'arch_{arch.replace(" ", "_").lower()}'
        features_df[col_name] = (df['archetype'] == arch).astype(int)

    # Get values for threshold features
    cod = features_df['change_of_direction']
    acc = features_df['acceleration']
    agi = features_df['agility']
    spd = features_df['speed']
    man = features_df['man_coverage']

    # Threshold features (6) - based on data analysis
    features_df['elite_cod'] = (cod >= 92).astype(int)
    features_df['elite_acc'] = (acc >= 94).astype(int)
    features_df['elite_agi'] = (agi >= 92).astype(int)
    features_df['elite_spd'] = (spd >= 93).astype(int)
    features_df['high_man'] = (man >= 78).astype(int)
    features_df['high_spd'] = (spd >= 92).astype(int)

    # Combo features (4) - based on data analysis
    features_df['triple_athletic'] = ((cod >= 92) & (acc >= 94) & (agi >= 92)).astype(int)
    features_df['speed_acc_combo'] = ((spd >= 92) & (acc >= 94)).astype(int)
    features_df['acc_agi_combo'] = ((acc >= 94) & (agi >= 91)).astype(int)
    features_df['cod_acc_combo'] = ((cod >= 91) & (acc >= 94)).astype(int)

    # Athletic stat count (1)
    features_df['elite_athletic_count'] = (
        (cod >= 90).astype(int) +
        (acc >= 93).astype(int) +
        (agi >= 90).astype(int) +
        (spd >= 91).astype(int)
    )

    # Athletic Sum thresholds (2) - SPD + ACC + AGI + COD
    athletic_sum = spd + acc + agi + cod
    features_df['high_athletic_sum'] = (athletic_sum >= 368).astype(int)
    features_df['good_athletic_sum'] = (athletic_sum >= 366).astype(int)

    # Archetype + Speed interaction features (1) - slow CBs in speed-dependent roles
    features_df['field_slow'] = ((df['archetype'] == 'Field') & (spd < 87)).astype(int)
    # Note: boundary_slow removed - only n=6 samples

    return features_df


def train_and_export_cb(df):
    """Train CB RF and export to JSON"""
    print("\n" + "=" * 60)
    print("CB RANDOM FOREST")
    print("=" * 60)

    print(f"Training samples: {len(df)}")

    X = engineer_cb_features(df)
    y = df['is_star_elite'].values
    feature_names = list(X.columns)

    print(f"Features ({len(feature_names)}): {feature_names}")

    X_train, X_test, y_train, y_test = train_test_split(
        X.values, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train RF
    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_pred_proba)
    print(f"\nTest AUC: {auc:.3f}")

    cv_auc = cross_val_score(model, X.values, y, cv=5, scoring='roc_auc')
    print(f"CV AUC: {cv_auc.mean():.3f} (+/- {cv_auc.std()*2:.3f})")

    y_pred = (y_pred_proba >= 0.5).astype(int)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal/Impact', 'Star/Elite']))

    # Export to JSON
    os.makedirs(os.path.join(OUTPUT_DIR, 'cb'), exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, 'cb', 'rf_model.json')
    export_random_forest(model, feature_names, output_path, "CB RF")

    return model, auc, cv_auc.mean()


def main():
    # Train QB models
    print("Loading QB data...")
    qb_df = load_and_prepare_qb_data()
    print(f"Total QB recruits: {len(qb_df)}")

    dt_model, dt_auc, dt_cv = train_and_export_dual_threat(qb_df)
    bin_model, bin_auc, bin_cv = train_and_export_binary(qb_df)

    # Train CB models if data exists
    print("\nLoading CB data...")
    cb_df = load_and_prepare_cb_data()

    cb_auc = None
    cb_cv = None
    if cb_df is not None:
        cb_model, cb_auc, cb_cv = train_and_export_cb(cb_df)
    else:
        print("  No CB data available. Skipping CB model training.")
        print("  To train CB model, create app/data/cb_recruits.csv with at least 30 samples.")

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"Dual Threat - Test AUC: {dt_auc:.3f}, CV AUC: {dt_cv:.3f}")
    print(f"Binary      - Test AUC: {bin_auc:.3f}, CV AUC: {bin_cv:.3f}")
    if cb_auc is not None:
        print(f"CB          - Test AUC: {cb_auc:.3f}, CV AUC: {cb_cv:.3f}")
    else:
        print(f"CB          - Not trained (no data)")
    print(f"\nRF models exported to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
