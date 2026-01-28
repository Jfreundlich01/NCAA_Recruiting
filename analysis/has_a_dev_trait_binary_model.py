"""
Binary Model: Normal vs Has Dev Trait (Impact/Star/Elite)
Helps users avoid recruiting Normal dev trait players
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

# Create binary target: Has Dev Trait = 1 (Impact/Star/Elite), Normal = 0
df['has_dev_trait'] = (~df['dev_trait'].isin(['normal'])).astype(int)

print("=" * 60)
print("BINARY MODEL: Normal vs Has Dev Trait (Impact/Star/Elite)")
print("=" * 60)
print("\nGoal: Identify recruits that are NOT Normal dev trait")

print("\n" + "-" * 60)
print("TARGET DISTRIBUTION")
print("-" * 60)
target_counts = df['has_dev_trait'].value_counts()
print(f"  Normal (avoid):        {target_counts[0]} ({target_counts[0]/len(df)*100:.1f}%)")
print(f"  Has Dev Trait (want):  {target_counts[1]} ({target_counts[1]/len(df)*100:.1f}%)")

print("\n  Breakdown of 'Has Dev Trait':")
for trait in ['impact', 'star', 'elite']:
    count = (df['dev_trait'] == trait).sum()
    print(f"    {trait.capitalize():8} {count:3} ({count/len(df)*100:.1f}%)")

# Prepare features
features = stat_columns + ['star_rating']
df['gem_encoded'] = df['gem_color'].map({'green': 1, 'red': -1}).fillna(0)
features.append('gem_encoded')

archetype_dummies = pd.get_dummies(df['archetype'], prefix='arch')
df = pd.concat([df, archetype_dummies], axis=1)
features.extend(archetype_dummies.columns.tolist())

X = df[features].fillna(0)
y = df['has_dev_trait']

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"\n" + "-" * 60)
print("TRAINING")
print("-" * 60)
print(f"  Training set: {len(X_train)} recruits")
print(f"  Test set:     {len(X_test)} recruits")

# Train
model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

# Metrics
accuracy = accuracy_score(y_test, y_pred)
auc = roc_auc_score(y_test, y_proba)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print("\n" + "=" * 60)
print("RESULTS")
print("=" * 60)

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
print("\n" + "-" * 60)
print("CONFUSION MATRIX")
print("-" * 60)
cm = confusion_matrix(y_test, y_pred)
print(f"\n                      Predicted")
print(f"                      Normal   Has Dev")
print(f"  Actual Normal        {cm[0][0]:3}       {cm[0][1]:3}")
print(f"  Actual Has Dev       {cm[1][0]:3}       {cm[1][1]:3}")

# Classification report
print("\n" + "-" * 60)
print("CLASSIFICATION REPORT")
print("-" * 60)
print(classification_report(y_test, y_pred, target_names=['Normal', 'Has Dev Trait']))

# Feature importance
print("\n" + "-" * 60)
print("TOP 10 FEATURE IMPORTANCE")
print("-" * 60)
importance = pd.DataFrame({
    'feature': features,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

for i, row in importance.head(10).iterrows():
    bar = "█" * int(row['importance'] * 100)
    print(f"  {row['feature']:20} {row['importance']:.3f} {bar}")

# Practical interpretation
print("\n" + "=" * 60)
print("PRACTICAL INTERPRETATION")
print("=" * 60)

print("\n  What this means for recruiting:")
print("  " + "-" * 50)
tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]

# If model says "Has Dev Trait", how often is it right?
if (tp + fp) > 0:
    print(f"  When model says 'Has Dev Trait': {tp/(tp+fp)*100:.0f}% actually do")

# If model says "Normal", how often is it right?
if (tn + fn) > 0:
    print(f"  When model says 'Normal':        {tn/(tn+fn)*100:.0f}% actually are")

# What % of good recruits does model catch?
if (tp + fn) > 0:
    print(f"  Model catches {tp/(tp+fn)*100:.0f}% of recruits with dev traits")

# What % of Normal recruits does model correctly flag?
if (tn + fp) > 0:
    print(f"  Model correctly avoids {tn/(tn+fp)*100:.0f}% of Normal recruits")

# Threshold analysis
print("\n" + "-" * 60)
print("THRESHOLD ANALYSIS")
print("-" * 60)
print("\n  Adjust threshold to prioritize avoiding Normal recruits:\n")
print(f"  {'Threshold':<12} {'Pred Has Dev':<14} {'Precision':<12} {'Recall':<12} {'Normals Avoided'}")
print(f"  {'-'*12} {'-'*14} {'-'*12} {'-'*12} {'-'*15}")

for threshold in [0.3, 0.4, 0.5, 0.6, 0.7]:
    y_pred_thresh = (y_proba >= threshold).astype(int)

    predicted_positive = (y_pred_thresh == 1).sum()
    if predicted_positive > 0:
        true_positive = ((y_pred_thresh == 1) & (y_test == 1)).sum()
        precision_t = true_positive / predicted_positive
        recall_t = true_positive / y_test.sum()

        # How many Normals correctly avoided
        true_negative = ((y_pred_thresh == 0) & (y_test == 0)).sum()
        normals_avoided = true_negative / (y_test == 0).sum()

        print(f"  {threshold:<12} {predicted_positive:<14} {precision_t:<12.0%} {recall_t:<12.0%} {normals_avoided:.0%}")

print("\n" + "=" * 60)
print("RECOMMENDATION")
print("=" * 60)

if auc > 0.7:
    print("\n  Model shows GOOD ability to distinguish Normal from Dev Trait")
elif auc > 0.6:
    print("\n  Model shows MODERATE ability to distinguish Normal from Dev Trait")
else:
    print("\n  Model needs more data to reliably distinguish Normal from Dev Trait")

print("\n  Use case: Filter out likely Normal recruits before spending")
print("  resources on detailed evaluation.")
print("\n" + "=" * 60)
