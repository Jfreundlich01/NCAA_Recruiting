"""
NCAA Recruit Dev Trait Analysis
Analyzes 222 QB/ATH recruits to find patterns predicting dev traits
"""

import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import warnings
warnings.filterwarnings('ignore')

# Load data
print("=" * 60)
print("NCAA RECRUIT DEV TRAIT ANALYSIS")
print("=" * 60)

df = pd.read_csv('/Users/jordan/Desktop/NCAA_Recruiting/app/data/recruits_rows.csv')
print(f"\nLoaded {len(df)} recruits")

# Parse stats from JSON
def parse_stats(stats_str):
    try:
        return json.loads(stats_str.replace('""', '"'))
    except:
        return {}

df['stats_parsed'] = df['stats'].apply(parse_stats)

# Extract individual stats
stat_columns = ['awareness', 'throw_power', 'short_accuracy', 'medium_accuracy',
                'deep_accuracy', 'throw_on_run', 'under_pressure', 'break_sack',
                'speed', 'acceleration']

for stat in stat_columns:
    df[stat] = df['stats_parsed'].apply(lambda x: x.get(stat))

# Clean dev trait column
df['dev_trait'] = df['ocr_dev_trait'].str.lower().str.strip()

# Filter to only rows with valid dev traits
valid_traits = ['normal', 'impact', 'star', 'elite']
df = df[df['dev_trait'].isin(valid_traits)]

print(f"Recruits with valid dev traits: {len(df)}")

# ============================================================
# SECTION 1: DATA OVERVIEW
# ============================================================
print("\n" + "=" * 60)
print("SECTION 1: DATA OVERVIEW")
print("=" * 60)

print("\n📊 Dev Trait Distribution:")
print("-" * 30)
trait_counts = df['dev_trait'].value_counts()
for trait in ['normal', 'impact', 'star', 'elite']:
    count = trait_counts.get(trait, 0)
    pct = count / len(df) * 100
    bar = "█" * int(pct / 2)
    print(f"  {trait.capitalize():8} {count:3} ({pct:5.1f}%) {bar}")

print("\n📊 Position Distribution:")
print("-" * 30)
print(df['position'].value_counts().to_string())

print("\n📊 Archetype Distribution:")
print("-" * 30)
print(df['archetype'].value_counts().to_string())

print("\n📊 Star Rating Distribution:")
print("-" * 30)
print(df['star_rating'].value_counts().sort_index().to_string())

print("\n📊 Gem Color Distribution:")
print("-" * 30)
gem_counts = df['gem_color'].fillna('none').value_counts()
print(gem_counts.to_string())

# ============================================================
# SECTION 2: STAT ANALYSIS BY DEV TRAIT
# ============================================================
print("\n" + "=" * 60)
print("SECTION 2: STAT AVERAGES BY DEV TRAIT")
print("=" * 60)

print("\n📈 Average Stats by Dev Trait:")
print("-" * 80)
stat_means = df.groupby('dev_trait')[stat_columns].mean()
stat_means = stat_means.reindex(['normal', 'impact', 'star', 'elite'])
print(stat_means.round(1).to_string())

print("\n📈 Stat Differences (Elite vs Normal):")
print("-" * 50)
diff = stat_means.loc['elite'] - stat_means.loc['normal']
diff_sorted = diff.sort_values(ascending=False)
for stat, value in diff_sorted.items():
    direction = "↑" if value > 0 else "↓"
    print(f"  {stat:18} {direction} {abs(value):+.1f}")

# ============================================================
# SECTION 3: CORRELATION ANALYSIS
# ============================================================
print("\n" + "=" * 60)
print("SECTION 3: CORRELATION WITH DEV TRAIT")
print("=" * 60)

# Encode dev trait as numeric (ordinal)
trait_order = {'normal': 0, 'impact': 1, 'star': 2, 'elite': 3}
df['trait_numeric'] = df['dev_trait'].map(trait_order)

print("\n📊 Correlation of Stats with Dev Trait (higher = more predictive):")
print("-" * 50)
correlations = {}
for stat in stat_columns:
    corr = df[stat].corr(df['trait_numeric'])
    correlations[stat] = corr

corr_sorted = sorted(correlations.items(), key=lambda x: abs(x[1]), reverse=True)
for stat, corr in corr_sorted:
    bar = "█" * int(abs(corr) * 50)
    sign = "+" if corr > 0 else "-"
    print(f"  {stat:18} {sign}{abs(corr):.3f} {bar}")

# Star rating correlation
star_corr = df['star_rating'].corr(df['trait_numeric'])
print(f"\n  {'star_rating':18} {'+' if star_corr > 0 else '-'}{abs(star_corr):.3f} {'█' * int(abs(star_corr) * 50)}")

# Gem color analysis
print("\n📊 Dev Trait Distribution by Gem Color:")
print("-" * 50)
gem_trait = pd.crosstab(df['gem_color'].fillna('none'), df['dev_trait'], normalize='index') * 100
gem_trait = gem_trait[['normal', 'impact', 'star', 'elite']]
print(gem_trait.round(1).to_string())

# ============================================================
# SECTION 4: ARCHETYPE ANALYSIS
# ============================================================
print("\n" + "=" * 60)
print("SECTION 4: DEV TRAIT BY ARCHETYPE")
print("=" * 60)

arch_trait = pd.crosstab(df['archetype'], df['dev_trait'], normalize='index') * 100
arch_trait = arch_trait[['normal', 'impact', 'star', 'elite']]
print(arch_trait.round(1).to_string())

# ============================================================
# SECTION 5: MACHINE LEARNING MODEL
# ============================================================
print("\n" + "=" * 60)
print("SECTION 5: PREDICTIVE MODEL")
print("=" * 60)

# Prepare features
features = stat_columns + ['star_rating']

# Add gem color as feature
df['gem_encoded'] = df['gem_color'].map({'green': 1, 'red': -1}).fillna(0)
features.append('gem_encoded')

# Add archetype encoding
archetype_dummies = pd.get_dummies(df['archetype'], prefix='arch')
df = pd.concat([df, archetype_dummies], axis=1)
features.extend(archetype_dummies.columns.tolist())

# Prepare X and y
X = df[features].fillna(0)
y = df['dev_trait']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"\n📊 Training set: {len(X_train)} recruits")
print(f"📊 Test set: {len(X_test)} recruits")

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
model.fit(X_train, y_train)

# Predictions
y_pred = model.predict(X_test)

# Accuracy
accuracy = accuracy_score(y_test, y_pred)
print(f"\n🎯 MODEL ACCURACY: {accuracy:.1%}")
print(f"   (Random guessing would be ~25%)")

# Cross-validation
cv_scores = cross_val_score(model, X, y, cv=5)
print(f"\n📊 Cross-Validation Accuracy: {cv_scores.mean():.1%} (+/- {cv_scores.std()*2:.1%})")

# Classification report
print("\n📊 Per-Class Performance:")
print("-" * 50)
print(classification_report(y_test, y_pred, target_names=['normal', 'impact', 'star', 'elite']))

# Confusion matrix
print("\n📊 Confusion Matrix:")
print("-" * 50)
cm = confusion_matrix(y_test, y_pred, labels=['normal', 'impact', 'star', 'elite'])
cm_df = pd.DataFrame(cm, index=['normal', 'impact', 'star', 'elite'],
                      columns=['pred_normal', 'pred_impact', 'pred_star', 'pred_elite'])
print(cm_df.to_string())

# Feature importance
print("\n📊 Feature Importance (Top 15):")
print("-" * 50)
importance = pd.DataFrame({
    'feature': features,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

for i, row in importance.head(15).iterrows():
    bar = "█" * int(row['importance'] * 100)
    print(f"  {row['feature']:20} {row['importance']:.3f} {bar}")

# ============================================================
# SECTION 6: KEY FINDINGS & RECOMMENDATIONS
# ============================================================
print("\n" + "=" * 60)
print("SECTION 6: KEY FINDINGS")
print("=" * 60)

print("\n🔍 TOP INSIGHTS:")
print("-" * 50)

# Find strongest predictors
top_stats = corr_sorted[:3]
print(f"\n1. STRONGEST STAT PREDICTORS:")
for stat, corr in top_stats:
    print(f"   • {stat}: r={corr:.3f}")

# Star rating insight
print(f"\n2. STAR RATING CORRELATION: r={star_corr:.3f}")
if star_corr > 0.3:
    print("   → Star rating is a STRONG predictor of dev trait")
elif star_corr > 0.15:
    print("   → Star rating is a MODERATE predictor")
else:
    print("   → Star rating has WEAK correlation with dev trait")

# Gem color insight
if 'green' in gem_trait.index:
    green_elite = gem_trait.loc['green', 'elite'] if 'elite' in gem_trait.columns else 0
    none_elite = gem_trait.loc['none', 'elite'] if 'none' in gem_trait.index and 'elite' in gem_trait.columns else 0
    print(f"\n3. GEM COLOR IMPACT:")
    print(f"   • Green gem: {green_elite:.1f}% Elite")
    print(f"   • No gem: {none_elite:.1f}% Elite")

# Model viability
print(f"\n4. MODEL VIABILITY:")
if accuracy > 0.6:
    print(f"   ✅ {accuracy:.1%} accuracy - MODEL IS VIABLE FOR PRODUCTION")
elif accuracy > 0.4:
    print(f"   ⚠️  {accuracy:.1%} accuracy - USEFUL but needs more data")
else:
    print(f"   ❌ {accuracy:.1%} accuracy - Needs significant improvement")

print("\n" + "=" * 60)
print("ANALYSIS COMPLETE")
print("=" * 60)
