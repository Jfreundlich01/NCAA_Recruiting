"""
Dual Threat Model: Star/Elite Prediction
Includes both QB and ATH positions with position-specific thresholds
"""

import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score, precision_score, recall_score, f1_score
import warnings
warnings.filterwarnings('ignore')

# Load data
df = pd.read_csv('/Users/jordan/Desktop/NCAA_Recruiting/app/data/recruits_rows.csv')

# Parse stats
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

# Filter to Dual Threat only
df = df[df['archetype'] == 'Dual Threat'].copy()

# Create binary target
df['is_star_elite'] = df['dev_trait'].isin(['star', 'elite']).astype(int)

print("=" * 70)
print("DUAL THREAT MODEL: Star/Elite Prediction (QB + ATH)")
print("=" * 70)

print("\n" + "-" * 70)
print("DATASET")
print("-" * 70)
print(f"  Total Dual Threat: {len(df)}")
print(f"  - QB:  {(df['position'] == 'QB').sum()}")
print(f"  - ATH: {(df['position'] == 'ATH').sum()}")
print(f"\n  Star/Elite: {df['is_star_elite'].sum()} ({df['is_star_elite'].mean()*100:.1f}%)")
print(f"  Normal/Impact: {(df['is_star_elite']==0).sum()} ({(df['is_star_elite']==0).mean()*100:.1f}%)")

print("\n  Dev Trait Breakdown:")
for trait in ['normal', 'impact', 'star', 'elite']:
    count = (df['dev_trait'] == trait).sum()
    print(f"    {trait.capitalize():8} {count:3} ({count/len(df)*100:.1f}%)")

# Create position feature
df['is_qb'] = (df['position'] == 'QB').astype(int)

# Create threshold-based features
print("\n" + "-" * 70)
print("ENGINEERED FEATURES")
print("-" * 70)

# Universal thresholds
df['elite_throw_power'] = (df['throw_power'] >= 95).astype(int)
df['high_throw_power'] = (df['throw_power'] >= 92).astype(int)
df['good_throw_power'] = (df['throw_power'] >= 90).astype(int)
df['med_throw_power'] = (df['throw_power'] >= 88).astype(int)

df['high_speed'] = (df['speed'] >= 85).astype(int)
df['good_speed'] = (df['speed'] >= 83).astype(int)

df['high_short_acc'] = (df['short_accuracy'] >= 78).astype(int)
df['high_awareness'] = (df['awareness'] >= 70).astype(int)

# Gem encoding
df['gem_green'] = (df['gem_color'] == 'green').astype(int)
df['gem_red'] = (df['gem_color'] == 'red').astype(int)

# QB-specific combo (speed >= 83 AND throw_power >= 90)
df['qb_speed_power'] = ((df['position'] == 'QB') & (df['speed'] >= 83) & (df['throw_power'] >= 90)).astype(int)

# QB triple combo (speed >= 83 AND throw_power >= 90 AND short_acc >= 78)
df['qb_triple_combo'] = ((df['position'] == 'QB') & (df['speed'] >= 83) & (df['throw_power'] >= 90) & (df['short_accuracy'] >= 78)).astype(int)

# ATH-specific combo (throw_power >= 88 AND speed >= 85)
df['ath_power_speed'] = ((df['position'] == 'ATH') & (df['throw_power'] >= 88) & (df['speed'] >= 85)).astype(int)

# Count high stats
df['high_stat_count'] = (
    (df['throw_power'] >= 90).astype(int) +
    (df['speed'] >= 82).astype(int) +
    (df['short_accuracy'] >= 80).astype(int) +
    (df['awareness'] >= 70).astype(int)
)

print("  Universal features:")
print("    - elite_throw_power (>=95), high_throw_power (>=92)")
print("    - good_throw_power (>=90), med_throw_power (>=88)")
print("    - high_speed (>=85), good_speed (>=83)")
print("    - high_short_acc (>=78), high_awareness (>=70)")
print("    - gem_green, gem_red")
print("    - high_stat_count (0-4)")
print("\n  Position-specific features:")
print("    - is_qb")
print("    - qb_speed_power (QB + speed>=83 + throw_power>=90)")
print("    - qb_triple_combo (QB + speed>=83 + throw_power>=90 + short_acc>=78)")
print("    - ath_power_speed (ATH + throw_power>=88 + speed>=85)")

# Prepare features
engineered_features = [
    'is_qb',
    'elite_throw_power', 'high_throw_power', 'good_throw_power', 'med_throw_power',
    'high_speed', 'good_speed', 'high_short_acc', 'high_awareness',
    'gem_green', 'gem_red',
    'qb_speed_power', 'qb_triple_combo', 'ath_power_speed',
    'high_stat_count'
]

features = stat_columns + ['star_rating'] + engineered_features

X = df[features].fillna(0)
y = df['is_star_elite']

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"\n" + "-" * 70)
print("TRAINING")
print("-" * 70)
print(f"  Training set: {len(X_train)} recruits")
print(f"  Test set:     {len(X_test)} recruits")
print(f"  Features:     {len(features)}")

# Train
model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

# Metrics
accuracy = accuracy_score(y_test, y_pred)
auc = roc_auc_score(y_test, y_proba)
precision = precision_score(y_test, y_pred, zero_division=0)
recall = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)

print("\n" + "=" * 70)
print("RESULTS")
print("=" * 70)

print(f"\n  Accuracy:   {accuracy:.1%}")
print(f"  AUC-ROC:    {auc:.3f}")
print(f"  Precision:  {precision:.1%}")
print(f"  Recall:     {recall:.1%}")
print(f"  F1 Score:   {f1:.3f}")

# Cross-validation
cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
cv_auc = cross_val_score(model, X, y, cv=5, scoring='roc_auc')
print(f"\n  CV Accuracy: {cv_scores.mean():.1%} (+/- {cv_scores.std()*2:.1%})")
print(f"  CV AUC:      {cv_auc.mean():.3f} (+/- {cv_auc.std()*2:.3f})")

# Confusion matrix
print("\n" + "-" * 70)
print("CONFUSION MATRIX")
print("-" * 70)
cm = confusion_matrix(y_test, y_pred)
print(f"\n                      Predicted")
print(f"                      N/I      S/E")
print(f"  Actual N/I          {cm[0][0]:3}      {cm[0][1]:3}")
print(f"  Actual S/E          {cm[1][0]:3}      {cm[1][1]:3}")

# Classification report
print("\n" + "-" * 70)
print("CLASSIFICATION REPORT")
print("-" * 70)
print(classification_report(y_test, y_pred, target_names=['Normal/Impact', 'Star/Elite']))

# Feature importance
print("\n" + "-" * 70)
print("FEATURE IMPORTANCE (Top 15)")
print("-" * 70)
importance = pd.DataFrame({
    'feature': features,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

for i, row in importance.head(15).iterrows():
    bar = "█" * int(row['importance'] * 80)
    print(f"  {row['feature']:20} {row['importance']:.3f} {bar}")

# Threshold analysis
print("\n" + "-" * 70)
print("THRESHOLD ANALYSIS")
print("-" * 70)
print(f"\n  {'Threshold':<12} {'Pred S/E':<12} {'Precision':<12} {'Recall':<12}")
print(f"  {'-'*12} {'-'*12} {'-'*12} {'-'*12}")

for threshold in [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]:
    y_pred_thresh = (y_proba >= threshold).astype(int)
    predicted_positive = (y_pred_thresh == 1).sum()
    if predicted_positive > 0:
        true_positive = ((y_pred_thresh == 1) & (y_test == 1)).sum()
        precision_t = true_positive / predicted_positive
        recall_t = true_positive / y_test.sum() if y_test.sum() > 0 else 0
        print(f"  {threshold:<12} {predicted_positive:<12} {precision_t:<12.0%} {recall_t:<12.0%}")
    else:
        print(f"  {threshold:<12} {0:<12} {'N/A':<12} {'0%':<12}")

# Simple rules validation
print("\n" + "=" * 70)
print("SIMPLE RULES VALIDATION (Full Dataset)")
print("=" * 70)

# QB Rules
print("\n  QB RULES:")
print(f"  {'-'*65}")
print(f"  {'Rule':<50} {'S/E Rate':<12} {'Count'}")
print(f"  {'-'*65}")

qb = df[df['position'] == 'QB']
qb_rules = [
    ("Throw Power >= 95", qb['throw_power'] >= 95),
    ("Speed >= 83 AND Throw Power >= 90", (qb['speed'] >= 83) & (qb['throw_power'] >= 90)),
    ("Speed >= 83 AND TP >= 90 AND Short Acc >= 78",
     (qb['speed'] >= 83) & (qb['throw_power'] >= 90) & (qb['short_accuracy'] >= 78)),
    ("Green Gem", qb['gem_color'] == 'green'),
    ("Green Gem AND Throw Power >= 90", (qb['gem_color'] == 'green') & (qb['throw_power'] >= 90)),
    ("Red Gem (AVOID)", qb['gem_color'] == 'red'),
]

for rule_name, mask in qb_rules:
    subset = qb[mask]
    if len(subset) > 0:
        se_rate = subset['is_star_elite'].mean() * 100
        print(f"  {rule_name:<50} {se_rate:>5.0f}%       {len(subset):>3}")

print(f"  {'Baseline (all QB Dual Threat)':<50} {qb['is_star_elite'].mean()*100:>5.0f}%       {len(qb):>3}")

# ATH Rules
print("\n  ATH RULES:")
print(f"  {'-'*65}")
print(f"  {'Rule':<50} {'S/E Rate':<12} {'Count'}")
print(f"  {'-'*65}")

ath = df[df['position'] == 'ATH']
ath_rules = [
    ("Throw Power >= 90", ath['throw_power'] >= 90),
    ("Throw Power >= 88 AND Speed >= 85", (ath['throw_power'] >= 88) & (ath['speed'] >= 85)),
    ("Green Gem", ath['gem_color'] == 'green'),
    ("Red Gem (AVOID)", ath['gem_color'] == 'red'),
]

for rule_name, mask in ath_rules:
    subset = ath[mask]
    if len(subset) > 0:
        se_rate = subset['is_star_elite'].mean() * 100
        print(f"  {rule_name:<50} {se_rate:>5.0f}%       {len(subset):>3}")

print(f"  {'Baseline (all ATH Dual Threat)':<50} {ath['is_star_elite'].mean()*100:>5.0f}%       {len(ath):>3}")

# Recommendations
print("\n" + "=" * 70)
print("RECRUITING RECOMMENDATIONS")
print("=" * 70)

print("""
  FOR QB DUAL THREAT:
  ===================

  MUST RECRUIT (80%+ Star/Elite chance):
    • Throw Power >= 95
    • Speed >= 83 AND Throw Power >= 90 AND Short Accuracy >= 78
    • Green Gem AND Throw Power >= 90

  STRONG RECRUIT (60-80% Star/Elite chance):
    • Speed >= 83 AND Throw Power >= 90
    • Green Gem (any stats)

  AVOID (<15% Star/Elite chance):
    • Red Gem (regardless of stats)

  FOR ATH DUAL THREAT:
  ====================

  STRONG RECRUIT (70%+ Star/Elite chance):
    • Throw Power >= 88 AND Speed >= 85
    • Green Gem

  MODERATE (50-60% Star/Elite chance):
    • Throw Power >= 90

  AVOID (0% Star/Elite chance):
    • Red Gem (regardless of stats)
""")

print("=" * 70)
