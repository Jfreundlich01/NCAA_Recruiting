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
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'app', 'assets', 'models')


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


def load_and_prepare_data():
    """Load and prepare the recruit data"""
    df = pd.read_csv(DATA_PATH)

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

    df['dev_trait'] = df['ocr_dev_trait'].str.lower().str.strip()
    valid_traits = ['normal', 'impact', 'star', 'elite']
    df = df[df['dev_trait'].isin(valid_traits)]
    df['is_star_elite'] = df['dev_trait'].isin(['star', 'elite']).astype(int)

    return df, stat_columns


def engineer_dual_threat_features(df, stat_columns):
    """Create features for Dual Threat model (26 features)"""
    features_df = pd.DataFrame()

    # Raw stats (10)
    for stat in stat_columns:
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


def engineer_binary_features(df, stat_columns):
    """Create features for Binary model"""
    features_df = pd.DataFrame()

    # Raw stats (10)
    for stat in stat_columns:
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


def train_and_export_dual_threat(df, stat_columns):
    """Train Dual Threat RF and export to JSON"""
    print("\n" + "=" * 60)
    print("DUAL THREAT RANDOM FOREST")
    print("=" * 60)

    dt_df = df[df['archetype'] == 'Dual Threat'].copy()
    print(f"Training samples: {len(dt_df)}")

    X = engineer_dual_threat_features(dt_df, stat_columns)
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


def train_and_export_binary(df, stat_columns):
    """Train Binary RF and export to JSON"""
    print("\n" + "=" * 60)
    print("BINARY RANDOM FOREST")
    print("=" * 60)

    print(f"Training samples: {len(df)}")

    X = engineer_binary_features(df, stat_columns)
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


def main():
    print("Loading data...")
    df, stat_columns = load_and_prepare_data()
    print(f"Total recruits: {len(df)}")

    dt_model, dt_auc, dt_cv = train_and_export_dual_threat(df, stat_columns)
    bin_model, bin_auc, bin_cv = train_and_export_binary(df, stat_columns)

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"Dual Threat - Test AUC: {dt_auc:.3f}, CV AUC: {dt_cv:.3f}")
    print(f"Binary      - Test AUC: {bin_auc:.3f}, CV AUC: {bin_cv:.3f}")
    print(f"\nRF models exported to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
