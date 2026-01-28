# NCAA Recruiting Dev Trait Predictor - Planning Document

## Project Overview

A mobile tool that predicts the hidden "dev trait" (Normal, Impact, Star, Elite) of recruits in NCAA College Football 25/26/27 based on visible scouting data. The core hypothesis is that patterns exist in visible recruit attributes that correlate with dev traits.

---

## Phase 1: Validation (Current Phase)

### Objective
Determine if dev traits are predictable from visible stats before building a full product.

### Approach
- Focus on **QB position only** to minimize variables
- Collect 200-500 QB recruit samples from NCAA 26
- Use OCR to accelerate data collection
- Analyze for patterns and build simple predictive model

### Success Criteria
- Clear correlation between visible stats and dev traits
- Simple model achieves >50% accuracy on 4-class prediction (random = 25%)
- OR clear signal on binary prediction (Elite/Star vs Impact/Normal)

### What We'll Learn
- Whether this product is even viable
- Which stats are most predictive
- Approximate data requirements for full product

---

## Product Vision

### Free Tier
- User selects position + archetype
- Manually inputs: height, weight, hometown, state, star rating
- Manually inputs the 8 position-specific scoutable stats
- Receives dev trait probability prediction

### Premium Tier
- User uploads screenshot of recruit scouting screen
- OCR extracts all data automatically
- Same prediction output, much faster workflow

### Data Flywheel (Critical)
Users contribute data → Model improves → Better predictions → More users → More data

**Forcing Function for Ground Truth:**
Users cannot advance to scout next recruiting class until they report dev traits for previous class's recruits they tracked. This ensures we get outcome data.

---

## Technical Architecture

### Stack
- **Frontend:** React Native / Expo (mobile-first)
- **Backend:** Supabase
  - Auth
  - PostgreSQL database
  - Storage (for screenshots)
  - Edge Functions (if needed)
- **OCR:** Claude Vision API
- **ML Model:** TBD (start simple - logistic regression, then iterate)

### Data Model (Initial)

```sql
-- Users
users (
  id uuid primary key,
  email text,
  created_at timestamp,
  current_game_year int,  -- tracks which recruiting class they're on
  tier text  -- 'free' or 'premium'
)

-- Recruits
recruits (
  id uuid primary key,
  user_id uuid references users,
  game_version text,  -- 'ncaa_25', 'ncaa_26', 'ncaa_27'
  game_year int,  -- in-game recruiting class year

  -- Basic Info
  name text,
  position text,
  archetype text,
  star_rating int,  -- 1-5 stars

  -- Physical
  height_inches int,
  weight_lbs int,

  -- Location
  hometown text,
  state text,

  -- The 8 scoutable stats (position-specific)
  stat_1_name text,
  stat_1_value int,
  stat_2_name text,
  stat_2_value int,
  stat_3_name text,
  stat_3_value int,
  stat_4_name text,
  stat_4_value int,
  stat_5_name text,
  stat_5_value int,
  stat_6_name text,
  stat_6_value int,
  stat_7_name text,
  stat_7_value int,
  stat_8_name text,
  stat_8_value int,

  -- Screenshot (premium)
  screenshot_url text,

  -- Ground Truth (filled in later)
  actual_dev_trait text,  -- 'normal', 'impact', 'star', 'elite'
  dev_trait_reported_at timestamp,

  -- Prediction (what we told them)
  predicted_dev_trait text,
  prediction_confidence jsonb,  -- {"normal": 0.1, "impact": 0.3, "star": 0.4, "elite": 0.2}

  created_at timestamp,
  updated_at timestamp
)

-- Position stat mappings (which 8 stats show for each position)
position_stats (
  id uuid primary key,
  position text,
  stat_order int,  -- 1-8
  stat_name text
)
```

---

## MVP Feature Set (Validation Phase)

### Must Have
1. **User auth** (Supabase Auth)
2. **Add recruit screen**
   - Position selector (start with QB only)
   - Archetype selector
   - Physical attributes inputs
   - 8 stat inputs (labeled correctly for position)
3. **Screenshot upload + OCR parsing** (premium flow)
4. **Recruit list view**
   - Shows all tracked recruits
   - Filter by game year
5. **Dev trait reporting**
   - Update recruit with actual dev trait
   - Gate to next year until current year reported
6. **Basic data export** (for analysis)

### Won't Have Yet
- Actual predictions (need data first)
- Multi-position support (QB only for validation)
- Polish/marketing

---

## OCR Implementation

### Input
Screenshot of recruit scouting screen from NCAA 26

### Output (structured data)
```json
{
  "name": "Marcus Johnson",
  "position": "QB",
  "archetype": "Pocket Passer",
  "star_rating": 4,
  "height": "6'3\"",
  "weight": 215,
  "hometown": "Dallas",
  "state": "TX",
  "stats": {
    "throw_power": 87,
    "throw_accuracy_short": 82,
    "throw_accuracy_mid": 79,
    "throw_accuracy_deep": 74,
    "throw_on_run": 71,
    "play_action": 83,
    "break_sack": 68,
    "speed": 72
  }
}
```

### Prompt Engineering Needed
- Need sample screenshots to build reliable extraction prompt
- Handle variations in screen layout/quality
- Validate extracted data makes sense (stats in valid ranges, etc.)

---

## Key UX Flows

### Flow 1: Add Recruit (Manual - Free)
1. Tap "Add Recruit"
2. Select position → QB
3. Select archetype → Pocket Passer / Scrambler / Balanced
4. Enter physical: height, weight
5. Enter location: hometown, state
6. Enter star rating
7. Enter 8 stats (labeled fields)
8. Save → Added to "Current Class" list

### Flow 2: Add Recruit (OCR - Premium)
1. Tap "Add Recruit"
2. Tap "Upload Screenshot"
3. Take photo or select from gallery
4. Review extracted data (edit if OCR made errors)
5. Confirm → Added to "Current Class" list

### Flow 3: Report Dev Traits (End of Season)
1. Notification: "Time to report dev traits for Class of 2026"
2. Shows list of tracked recruits
3. For each: select actual dev trait from dropdown
4. Cannot proceed to next class until all reported
5. Option to mark "Didn't sign" for recruits they lost

### Flow 4: View Predictions (Future - Post Validation)
1. After entering recruit data
2. See prediction card:
   - "Our prediction: Star (67% confidence)"
   - Breakdown: Elite 12% | Star 67% | Impact 18% | Normal 3%

---

## Data Collection Strategy

### Phase 1: Self-Collection (Now)
- You manually scout QBs in NCAA 26
- Use the app with OCR to quickly capture data
- Target: 200-500 QBs with dev trait outcomes
- Timeline: Before NCAA 27 releases (June)

### Phase 2: Beta Users
- Invite small group of dedicated players
- Free access in exchange for data contribution
- Target: 1000+ recruits across positions

### Phase 3: Public Launch (with NCAA 27)
- Full product with predictions
- Data flywheel kicks in
- Model continuously improves

---

## Open Questions

### Game Mechanics
- [ ] What are the exact 8 stats shown for each position?
- [ ] Does archetype affect which stats show, or just position?
- [ ] Are there other visible attributes we should capture? (ranking, school interest level, etc.)

### Product
- [ ] How to handle recruits user scouted but didn't sign? (Still valuable data if they know the dev trait somehow)
- [ ] Should we track which school user is playing as? (Might affect recruit pool)
- [ ] Any value in tracking recruiting pipeline/offers from other schools?

### Technical
- [ ] Need sample screenshots to validate OCR approach
- [ ] Hosting/costs for Supabase at scale?
- [ ] Model hosting strategy when predictions go live

---

## Next Steps

### Immediate (This Week)
1. [ ] Set up Expo project with Supabase integration
2. [ ] Build basic auth flow
3. [ ] Build "Add Recruit" screen (manual input, QB only)
4. [ ] Build recruit list view
5. [ ] Test OCR with sample screenshots

### Short Term (Before NCAA 27)
1. [ ] Complete OCR integration
2. [ ] Collect 200-500 QB samples
3. [ ] Analyze data for patterns
4. [ ] Build simple predictive model
5. [ ] Validate core hypothesis

### Medium Term (NCAA 27 Launch)
1. [ ] Expand to all positions
2. [ ] Integrate predictions into app
3. [ ] Launch publicly
4. [ ] Build data flywheel

---

## ML Pipeline: From Data to Predictions

### Prerequisites
- **Minimum:** 200 QBs with `actual_dev_trait` reported
- **Ideal:** 300+ QBs with good distribution across Normal/Impact/Star/Elite
- All 10 stats filled in for each recruit

### Step 1: Export & Analyze (~15 min)

**Export data from Supabase:**
```sql
SELECT
  name, position, archetype, star_rating, gem_color,
  height_feet, height_inches, weight_lbs,
  stats->>'awareness' as awareness,
  stats->>'throw_power' as throw_power,
  stats->>'short_accuracy' as short_accuracy,
  stats->>'medium_accuracy' as medium_accuracy,
  stats->>'deep_accuracy' as deep_accuracy,
  stats->>'throw_on_run' as throw_on_run,
  stats->>'under_pressure' as under_pressure,
  stats->>'break_sack' as break_sack,
  stats->>'speed' as speed,
  stats->>'acceleration' as acceleration,
  actual_dev_trait
FROM recruits
WHERE actual_dev_trait IS NOT NULL
  AND position = 'QB';
```

**Basic analysis in Python notebook:**
- Load data into pandas DataFrame
- Check distribution of dev traits (need decent samples of each)
- Check for missing values
- Basic descriptive statistics

### Step 2: Find Correlations (~15 min)

**Correlation analysis:**
```python
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

# Encode dev trait as numeric for correlation
trait_map = {'normal': 0, 'impact': 1, 'star': 2, 'elite': 3}
df['trait_numeric'] = df['actual_dev_trait'].map(trait_map)

# Correlation heatmap
correlations = df[stat_columns + ['trait_numeric']].corr()
sns.heatmap(correlations, annot=True)
```

**Key questions to answer:**
- Which stats correlate most with higher dev traits?
- Does star_rating correlate with dev trait?
- Does gem_color (green vs red) predict dev trait?
- Does archetype affect dev trait distribution?

**Visualizations:**
- Box plots: each stat grouped by dev trait
- Bar charts: dev trait distribution by star rating
- Bar charts: dev trait distribution by gem color

### Step 3: Train Initial Model (~15 min)

**Simple model to test viability:**
```python
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

# Features
features = [
    'awareness', 'throw_power', 'short_accuracy', 'medium_accuracy',
    'deep_accuracy', 'throw_on_run', 'under_pressure', 'break_sack',
    'speed', 'acceleration', 'star_rating', 'gem_color_encoded'
]

X = df[features]
y = df['actual_dev_trait']

# Split 80/20
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.2%}")
print(classification_report(y_test, y_pred))
```

**Success criteria:**
- **>50% accuracy** = better than random (random = 25% for 4 classes)
- **>60% accuracy** = useful for users
- **>70% accuracy** = highly valuable product

**Feature importance:**
```python
# Which stats matter most?
importance = pd.DataFrame({
    'feature': features,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)
print(importance)
```

### Step 4: Refine & Validate (~15 min)

**Try different approaches:**
- Binary classification: Elite/Star vs Impact/Normal
- Ordinal regression (since traits have order)
- Different algorithms: XGBoost, Logistic Regression

**Cross-validation for reliable accuracy:**
```python
from sklearn.model_selection import cross_val_score
scores = cross_val_score(model, X, y, cv=5)
print(f"CV Accuracy: {scores.mean():.2%} (+/- {scores.std()*2:.2%})")
```

### Step 5: Deploy Model

**Option A: Edge Function (Recommended for MVP)**
- Export model to ONNX format
- Create Supabase Edge Function that loads model
- Function accepts recruit stats, returns prediction + confidence

**Option B: External Python API**
- Deploy FastAPI on Railway/Fly.io
- More flexibility, full Python ML stack
- Slightly more infrastructure to manage

**Option C: In-App (Future optimization)**
- Convert to TensorFlow Lite
- Bundle in Expo app
- Instant offline predictions

### Deliverables from Analysis

After running the analysis, you'll get:

1. **Data Quality Report**
   - Total recruits with ground truth
   - Distribution across dev traits
   - Any data quality issues

2. **Correlation Findings**
   - Top 5 stats that correlate with dev trait
   - Impact of star rating and gem color
   - Archetype analysis

3. **Model Performance**
   - Accuracy score
   - Per-class precision/recall
   - Confusion matrix

4. **Recommendation**
   - Is prediction viable? Yes/No
   - Minimum accuracy achievable
   - Suggested improvements (more data, different features, etc.)

---

## Appendix: Position-Specific Stats

*To be filled in - need the 8 stats for each position*

### QB
1.
2.
3.
4.
5.
6.
7.
8.

### RB
1.
2.
3.
4.
5.
6.
7.
8.

*(Continue for all positions...)*
