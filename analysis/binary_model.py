"""
Binary Model: Star/Elite vs Normal/Impact
"""

import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score
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

# Create binary target: Star/Elite = 1, Normal/Impact = 0
df['is_star_elite'] = df['dev_trait'].isin(['star', 'elite']).astype(int)

print("=" * 60)
print("BINARY MODEL: Star/Elite vs Normal/Impact")
print("=" * 60)

print("\n📊 Target Distribution:")
print("-" * 30)
target_counts = df['is_star_elite'].value_counts()
print(f"  Normal/Impact: {target_counts[0]} ({target_counts[0]/len(df)*100:.1f}%)")
print(f"  Star/Elite:    {target_counts[1]} ({target_counts[1]/len(df)*100:.1f}%)")

# Prepare features
features = stat_columns + ['star_rating']
df['gem_encoded'] = df['gem_color'].map({'green': 1, 'red': -1}).fillna(0)
features.append('gem_encoded')

archetype_dummies = pd.get_dummies(df['archetype'], prefix='arch')
df = pd.concat([df, archetype_dummies], axis=1)
features.extend(archetype_dummies.columns.tolist())

X = df[features].fillna(0)
y = df['is_star_elite']

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"\n📊 Training: {len(X_train)} | Test: {len(X_test)}")

# Train
model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

# Metrics
accuracy = accuracy_score(y_test, y_pred)
auc = roc_auc_score(y_test, y_proba)

print("\n" + "=" * 60)
print("RESULTS")
print("=" * 60)

print(f"\n🎯 ACCURACY: {accuracy:.1%}")
print(f"🎯 AUC-ROC:  {auc:.3f}")

# Cross-validation
cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
cv_auc = cross_val_score(model, X, y, cv=5, scoring='roc_auc')
print(f"\n📊 CV Accuracy: {cv_scores.mean():.1%} (+/- {cv_scores.std()*2:.1%})")
print(f"📊 CV AUC:      {cv_auc.mean():.3f} (+/- {cv_auc.std()*2:.3f})")

# Classification report
print("\n📊 Classification Report:")
print("-" * 50)
print(classification_report(y_test, y_pred, target_names=['Normal/Impact', 'Star/Elite']))

# Confusion matrix
print("\n📊 Confusion Matrix:")
print("-" * 30)
cm = confusion_matrix(y_test, y_pred)
print(f"                  Predicted")
print(f"                  N/I    S/E")
print(f"  Actual N/I      {cm[0][0]:3}    {cm[0][1]:3}")
print(f"  Actual S/E      {cm[1][0]:3}    {cm[1][1]:3}")

# Feature importance
print("\n📊 Top 10 Feature Importance:")
print("-" * 50)
importance = pd.DataFrame({
    'feature': features,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

for i, row in importance.head(10).iterrows():
    bar = "█" * int(row['importance'] * 100)
    print(f"  {row['feature']:20} {row['importance']:.3f} {bar}")

# Compare to 4-class
print("\n" + "=" * 60)
print("COMPARISON: Binary vs 4-Class")
print("=" * 60)
print(f"\n  4-Class Model:  37.8% accuracy (random = 25%)")
print(f"  Binary Model:   {accuracy:.1%} accuracy (random = 50%)")
print(f"\n  Binary AUC: {auc:.3f} (0.5 = random, 1.0 = perfect)")

if auc > 0.7:
    print("\n  ✅ Binary model shows GOOD predictive power!")
elif auc > 0.6:
    print("\n  ⚠️  Binary model shows MODERATE predictive power")
else:
    print("\n  ❌ Binary model needs more data")

# Practical interpretation
print("\n" + "=" * 60)
print("PRACTICAL INTERPRETATION")
print("=" * 60)

# Calculate rates at different thresholds
print("\n📊 Prediction Thresholds:")
print("-" * 50)
for threshold in [0.3, 0.4, 0.5, 0.6, 0.7]:
    y_pred_thresh = (y_proba >= threshold).astype(int)

    # Of those predicted Star/Elite, what % actually are?
    predicted_positive = (y_pred_thresh == 1).sum()
    if predicted_positive > 0:
        true_positive = ((y_pred_thresh == 1) & (y_test == 1)).sum()
        precision = true_positive / predicted_positive
        recall = true_positive / y_test.sum()
        print(f"  Threshold {threshold}: Predict {predicted_positive:2} as Star/Elite → {precision:.0%} correct, catches {recall:.0%} of actual")
