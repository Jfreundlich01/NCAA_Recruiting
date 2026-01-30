# CB Model Stats & Analysis

**Last Updated:** 2026-01-29
**Current Version:** 2.0
**Dataset:** CB_recruits_rows.csv (315 total CBs)
**Model:** Hybrid Rules + RandomForestClassifier (n_estimators=100, class_weight='balanced')

---

## Summary (v2.0)

| Metric | Value |
|--------|-------|
| **Test AUC-ROC** | 0.732 |
| **CV AUC-ROC** | 0.639 (±0.162) |
| **Star/Elite Rate** | 32% (101/315) |
| **Best Rule** | Athletic Sum ≥368 → 65% SE (n=37) |

*Note: Model uses Athletic Sum (SPD+ACC+AGI+COD) as primary predictor*

---

## Cross-Validation Results (5-Fold)

| Metric | Mean | Std Dev |
|--------|------|---------|
| AUC-ROC | 0.638 | ±0.167 |

---

## Dataset Statistics

| Metric | Value |
|--------|-------|
| Total CB Recruits | 201 |
| Training Set | 160 |
| Test Set | 41 |
| Normal/Impact | 150 (74.3%) |
| Star/Elite | 52 (25.7%) |
| Feature Count | 30 |

### Dev Trait Breakdown

| Trait | Count | Percentage |
|-------|-------|------------|
| Normal | 66 | 32.7% |
| Impact | 83 | 41.1% |
| Star | 41 | 20.3% |
| Elite | 11 | 5.4% |

### Archetype Breakdown

| Archetype | Count | Star/Elite Rate |
|-----------|-------|-----------------|
| Zone | 61 | 23% |
| Bump and Run | 49 | 33% |
| Boundary | 44 | 21% |
| Field | 43 | 28% |

### Gem Distribution

| Gem Color | Count | Star/Elite Rate |
|-----------|-------|-----------------|
| No Gem | 165 | 24% |
| Green | 25 | 44% |
| Red | 12 | 8% |

---

## Feature Importance (Top 15)

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | catching | 0.097 |
| 2 | man_coverage | 0.097 |
| 3 | change_of_direction | 0.093 |
| 4 | tackle | 0.088 |
| 5 | zone_coverage | 0.078 |
| 6 | press | 0.077 |
| 7 | awareness | 0.076 |
| 8 | agility | 0.076 |
| 9 | elite_athletic_count | 0.062 |
| 10 | speed | 0.055 |
| 11 | acceleration | 0.048 |
| 12 | star_rating | 0.035 |
| 13 | gem_green | 0.028 |
| 14 | high_spd | 0.022 |
| 15 | elite_acc | 0.019 |

---

## Stat Analysis (Star/Elite vs Normal/Impact)

| Stat | SE Mean | NI Mean | Difference |
|------|---------|---------|------------|
| awareness | 71.0 | 70.3 | +0.6 |
| speed | 90.4 | 89.6 | +0.8 |
| acceleration | 92.7 | 92.4 | +0.3 |
| change_of_direction | 89.7 | 88.8 | +0.9 |
| agility | 90.6 | 89.5 | +1.1 |
| man_coverage | 73.7 | 72.7 | +1.0 |
| zone_coverage | 73.2 | 73.3 | -0.1 |
| press | 72.8 | 72.2 | +0.5 |
| catching | 66.7 | 66.3 | +0.4 |
| tackle | 65.7 | 66.0 | -0.3 |

**Key Insight:** No single CB stat strongly differentiates Star/Elite from Normal/Impact. Maximum difference is only +1.1 (agility). This contrasts with QB where Throw Power has massive differentiation.

---

## Discriminative Thresholds (Global)

| Stat | Threshold | Above SE% | Below SE% | Count Above |
|------|-----------|-----------|-----------|-------------|
| change_of_direction | >= 92 | **61%** | 22% | 18 |
| acceleration | >= 94 | **54%** | 21% | 28 |
| agility | >= 92 | **50%** | 23% | 22 |
| speed | >= 93 | **43%** | 23% | 23 |
| man_coverage | >= 78 | **45%** | 22% | 33 |

---

## Rules Validation

### Global Rules (Any Archetype)

| Rule | S/E Rate | Count | Accuracy |
|------|----------|-------|----------|
| **Athletic Sum ≥370** (SPD+ACC+AGI+COD) | **100%** | 8 | Perfect |
| **Athletic Sum ≥368** | **62%** | 24 | Excellent |
| Athletic Sum ≥366 | **51%** | 35 | Good |
| Triple Athletic (COD>=92 + ACC>=94 + AGI>=92) | **78%** | 9 | Excellent |
| Speed+Acc Combo (SPD>=92 + ACC>=94) | **60%** | 10 | Good |
| Acc+Agi Combo (ACC>=94 + AGI>=91) | **50%** | 2 | Small sample |
| Elite COD (>=92) | **40%** | 5 | Moderate |
| Red Gem (AVOID) | **0%** | 11 | Perfect |

### Archetype-Specific Rules

#### Bump and Run (33% baseline SE)

| Rule | S/E Rate | Count |
|------|----------|-------|
| AGI >= 93 | **100%** | 5 |
| Green Gem | **55%** | 11 |
| ACC >= 95 | 50% | 16 |
| SPD >= 93 | 50% | 12 |

#### Zone (23% baseline SE)

| Rule | S/E Rate | Count |
|------|----------|-------|
| COD >= 91 | **100%** | 3 |
| Green + ZC >= 77 | **75%** | 4 |
| COD >= 90 + ZC >= 78 | **60%** | 10 |
| Green Gem | **50%** | 6 |

#### Field (28% baseline SE)

| Rule | S/E Rate | Count |
|------|----------|-------|
| ZC >= 78 | **60%** | 10 |
| Balanced Coverage (ZC+MAN >= 155) | **50%** | 18 |

#### Boundary (21% baseline SE)

| Rule | S/E Rate | Count |
|------|----------|-------|
| AGI >= 91 | 100% | 3 (small sample) |
| No strong rules found | - | - |

---

## Hybrid System Performance

| Component | Coverage | Star/Elite Captured |
|-----------|----------|---------------------|
| Rules | 37% (75/201) | 63% (33/52) |
| RF Model | 63% (126/201) | 37% (19/52) |

### RF Model Subset Analysis

| Metric | Value |
|--------|-------|
| Recruits needing RF | 126 |
| Star/Elite in RF subset | 19 (15%) |
| Archetype breakdown | Zone: 44, Boundary: 36, Field: 21, B&R: 20 |

---

## Elite Recruit Profile (n=11)

| Stat | Elite Mean |
|------|------------|
| speed | 92.0 |
| acceleration | 93.9 |
| agility | 91.7 |
| change_of_direction | 90.6 |
| man_coverage | 75.2 |
| zone_coverage | 72.0 |
| press | 74.1 |

**Elite Gem Distribution:** 6 Green, 5 No Gem, 0 Red
**Elite Archetype Distribution:** Bump and Run (5), Zone (3), Boundary (2), Field (1)

---

## Engineered Features Used (30 total)

**Raw Stats (10):**
- awareness, speed, acceleration, change_of_direction, agility
- man_coverage, zone_coverage, press, catching, tackle

**Basic Features (3):**
- star_rating
- gem_green, gem_red

**Archetype One-Hot (4):**
- arch_boundary, arch_bump_and_run, arch_field, arch_zone

**Threshold Features (6):**
- elite_cod (>=92), elite_acc (>=94), elite_agi (>=92)
- elite_spd (>=93), high_man (>=78), high_spd (>=92)

**Combo Features (4):**
- triple_athletic (COD>=92 + ACC>=94 + AGI>=92)
- speed_acc_combo (SPD>=92 + ACC>=94)
- acc_agi_combo (ACC>=94 + AGI>=91)
- cod_acc_combo (COD>=91 + ACC>=94)

**Count Feature (1):**
- elite_athletic_count (sum of COD>=90, ACC>=93, AGI>=90, SPD>=91)

**Athletic Sum Features (2):**
- high_athletic_sum (SPD+ACC+AGI+COD >= 368)
- good_athletic_sum (SPD+ACC+AGI+COD >= 366)

---

## Recruiting Recommendations (v2.0 Updated)

### MUST RECRUIT (85%+ Star/Elite chance)

- **Athletic Sum ≥372** = 100% SE (n=10) - TOP TIER
- **Athletic Sum ≥370** = 93% SE (n=15)
- **Bump and Run with AGI >= 93** = 100% SE (n=8)
- **Zone with COD >= 91** = 88% SE (n=8)
- **Triple Athletic** (COD>=92 + ACC>=94 + AGI>=92) = 85% SE (n=13)

### STRONG RECRUIT (60-75% Star/Elite chance)

- **Athletic Sum ≥368** = 65% SE (n=37) - MOST RELIABLE
- Speed+Acc Combo: SPD >= 92 AND ACC >= 94 = 57% SE (n=28)

### MODERATE (50-60% Star/Elite chance)

- **Athletic Sum ≥366** = 54% SE (n=59)
- **Zone with COD >= 90** = 54% SE (n=28)
- **Green Gem** = 51% SE (n=47)
- Tall + Fast: 6'2"+ with SPD ≥ 91 = 50% SE

### BELOW AVERAGE (25-35% Star/Elite chance)

- **Red Gem** = 26% SE (n=19) - slightly below baseline, not catastrophic
- Field with ZC >= 78 = 44% SE (weakened from v1)

### Notes

- Red Gem is NOT an automatic avoid - some red gem CBs can succeed
- Field archetype has no strong rules - use RF model
- Baseline SE rate is 32% in v2 dataset

---

## Comparison to QB Dual Threat Model

| Metric | QB Dual Threat | CB |
|--------|---------------|-----|
| Sample Size | 152 | 202 |
| Base SE Rate | 39% | 26% |
| CV AUC-ROC | **0.722** | 0.638 |
| Test AUC-ROC | **0.868** | 0.658 |
| Rules Coverage | 36% | 37% |
| SE Captured by Rules | 55% | **63%** |
| Single Dominant Stat? | Yes (TP>=95 = 91%) | No |

**Key Insight:** QB has one "cheat code" stat (Throw Power >= 95 = 91% Star/Elite). CB has no single dominant predictor - success requires combinations of multiple athletic stats, making prediction inherently harder.

---

---

## Abilities Analysis

### Ability Frequency

| Ability | Count | Star/Elite Rate | vs Baseline (26%) |
|---------|-------|-----------------|-------------------|
| Quick Jump | 33 | 18% | -8% (negative!) |
| Jammer | 2 | 100% | +74% |
| Robber | 1 | 100% | +74% |

### Key Findings - Abilities

- **Jammer OR Robber = 100% Star/Elite** (only 3 recruits, but notable)
- **Quick Jump is actually NEGATIVE** (18% vs 26% baseline)
- Having ANY ability = 21% SE (worse than no ability at 27%)

### Jammer Recruits (100% SE)
- AUSTIN LEMMONS: Elite, Boundary
- ERIC RUIZ: Star, Boundary

### Robber Recruits (100% SE)
- BEN GAMEZ: Star, Field

---

## Mentals Analysis

### Mental Frequency

| Mental | Count | Star/Elite Rate | vs Baseline (26%) |
|--------|-------|-----------------|-------------------|
| Road Dog | 67 | 24% | -2% |
| Adrenaline | 40 | 25% | -1% |
| **Team Player** | 38 | **34%** | **+8%** |
| Clearheaded | 36 | 25% | -1% |
| Fan Favorite | 32 | **19%** | **-7% (negative)** |
| Rollercoaster | 29 | 31% | +5% |
| **The Natural** | 27 | **33%** | **+7%** |
| **Legion** | 21 | **38%** | **+12%** |
| Winning Time | 16 | 25% | -1% |

### Mentals by Dev Trait

**ELITE (11 recruits):**
- Road Dog: 7 (64%)
- Adrenaline: 4 (36%)
- Rollercoaster: 3 (27%)
- Clearheaded: 3 (27%)
- Legion: 2 (18%)

**STAR (41 recruits):**
- Team Player: 12 (29%)
- Road Dog: 9 (22%)
- The Natural: 8 (20%)
- Rollercoaster: 6 (15%)
- Legion: 6 (15%)

**IMPACT (83 recruits):**
- Road Dog: 30 (36%)
- Adrenaline: 19 (23%)
- Clearheaded: 16 (19%)
- Team Player: 14 (17%)
- Rollercoaster: 13 (16%)

**NORMAL (66 recruits):**
- Road Dog: 21 (32%)
- Fan Favorite: 15 (23%)
- Clearheaded: 11 (17%)
- Team Player: 11 (17%)
- Adrenaline: 11 (17%)

### Mental Count Analysis

| Mental Count | Recruits | Star/Elite Rate |
|--------------|----------|-----------------|
| 0 mentals | 50 | 22% |
| 1 mental | 45 | 27% |
| 2 mentals | 57 | 26% |
| 3 mentals | 49 | 29% |

---

## Mental + Stat Combos

### High-Value Combos (≥50% SE)

| Combo | Count | SE Rate | Notes |
|-------|-------|---------|-------|
| Jammer/Robber (any) | 3 | **100%** | Small but perfect |
| Legion + Green Gem | 3 | **67%** | Small sample |
| **Team Player + AGI ≥ 91** | 13 | **62%** | Good sample! |
| Legion + SPD ≥ 91 | 12 | **58%** | Good sample |
| **NOT Fan Favorite + ACC ≥ 94** | 23 | **57%** | Good sample! |
| Team Player + Green Gem | 6 | **50%** | Moderate |

### Other Combos Tested

| Combo | Count | SE Rate |
|-------|-------|---------|
| Legion + ACC >= 93 | 13 | 38% |
| Team Player + ACC >= 93 | 25 | 32% |
| The Natural + SPD >= 91 | 13 | 38% |
| The Natural + ACC >= 93 | 14 | 36% |
| Fan Favorite + NO green gem | 31 | 16% |
| (Legion OR Team Player) + ACC >= 93 | 35 | 31% |
| (Legion OR The Natural) + SPD >= 91 | 25 | 48% |

### Do Mentals Improve Existing Rules?

| Rule | Without Good Mental | With Good Mental |
|------|---------------------|------------------|
| Triple Athletic | 78% (n=9) | 100% (n=2) |
| Speed+Acc Combo | 73% (n=15) | 62% (n=8) |
| Green Gem | 44% (n=25) | 46% (n=13) |

*Good mental = Legion, Team Player, or The Natural*

**Conclusion:** Mentals don't consistently improve stat-based rules. Sample sizes too small.

---

## Mental/Ability Recommendations

### For Human Decision-Making (Tiebreakers)

**POSITIVE SIGNALS (prefer these CBs):**
- Jammer ability → instant recruit
- Robber ability → instant recruit
- Legion mental (+12% vs baseline)
- Team Player mental (+8% vs baseline)
- The Natural mental (+7% vs baseline)

**NEGATIVE SIGNALS (deprioritize these CBs):**
- Fan Favorite mental (-7% vs baseline)
- Quick Jump ability (-8% vs baseline)

### Why Not Add to Model?

1. Sample sizes too small (strongest signals have n=3)
2. Marginal improvement (~10% gain at best)
3. Risk of overfitting with 202 recruits
4. Current system already captures 63% of Star/Elite

**Recommendation:** Use mentals as manual tiebreakers, not model features. Revisit when dataset reaches 500+ CBs.

---

---

## Height Analysis

### Height Distribution

| Metric | Value |
|--------|-------|
| Mean | 72.3" (6'0") |
| Min | 70" (5'10") |
| Max | 75" (6'3") |

### Height by Dev Trait

| Dev Trait | Mean Height | Count |
|-----------|-------------|-------|
| Elite | 72.6" | 11 |
| Star | 72.4" | 41 |
| Impact | 72.1" | 83 |
| Normal | 72.5" | 66 |

**Star/Elite vs Normal/Impact: only +0.1" difference** - Height alone is NOT predictive.

### Height Brackets

| Height | Count | SE Rate |
|--------|-------|---------|
| 5'10" | 20 | 25% |
| 5'11" | 50 | 28% |
| 6'0" | 42 | 19% |
| 6'1" | 33 | 18% |
| **6'2"** | 47 | **36%** |
| 6'3"+ | 9 | 22% |

### Height + Stats Combos (Key Finding!)

**Height alone isn't predictive, but HEIGHT + SPEED is:**

| Combo | SE Rate | vs Stat Alone | Count |
|-------|---------|---------------|-------|
| **SPD ≥ 91 + 6'2"+** | **50%** | **+14%** | 20 |
| SPD ≥ 91 + under 6'2" | 31% | -5% | 52 |
| **SPD ≥ 92 + 6'1"+** | **45%** | **+7%** | 22 |
| SPD ≥ 92 + under 6'1" | 32% | -6% | 31 |
| **Press ≥ 75 + 6'2"+** | **47%** | **+15%** | 15 |
| Press ≥ 75 + under 6'2" | 26% | -6% | 38 |

### Height by Archetype

| Archetype | SE Mean Height | NI Mean Height | Diff |
|-----------|----------------|----------------|------|
| Boundary | 72.8" | 72.2" | +0.5" |
| Bump and Run | 71.8" | 71.6" | +0.2" |
| Field | 72.5" | 72.0" | +0.5" |
| Zone | 72.9" | 73.0" | -0.1" |

### Height Conclusion

**Tall + Fast = Premium CB**
- 6'2"+ with SPD ≥ 91 → 50% Star/Elite (makes football sense)
- Height alone doesn't predict dev trait
- Consider as tiebreaker: prefer taller CBs when speed is similar

---

## Weight Analysis

### Weight Distribution

| Metric | Value |
|--------|-------|
| Mean | 182 lbs |
| Range | 160-213 lbs |

### Weight by Dev Trait

| Dev Trait | Mean Weight |
|-----------|-------------|
| Elite | 186 lbs |
| Star | 180 lbs |
| Impact | 181 lbs |
| Normal | 185 lbs |

**Star/Elite vs Normal/Impact: -2 lbs difference**

### Weight Thresholds

| Threshold | SE Rate | Count |
|-----------|---------|-------|
| ≥ 170 lbs | 24% | 152 |
| ≥ 175 lbs | 23% | 135 |
| ≥ 180 lbs | 24% | 111 |
| ≥ 185 lbs | 23% | 86 |
| ≥ 190 lbs | 21% | 61 |

### Weight Conclusion

**Weight is NOT predictive** - No useful thresholds, minimal difference between dev traits.

---

## Physical Attributes Summary

| Attribute | Predictive Value | Notes |
|-----------|------------------|-------|
| Height alone | No | +0.1" difference |
| Height + Speed | **Yes** | 6'2" + SPD≥91 = 50% SE |
| Height + Press | **Yes** | 6'2" + Press≥75 = 47% SE |
| Weight | No | -2 lbs difference |

**Recommendation:** Use "tall + fast" (6'2"+ with SPD ≥ 91) as a tiebreaker rule. Sample size is decent (n=20, 50% SE).

---

## Athletic Sum Analysis (SPD + ACC + AGI + COD)

### Athletic Sum Distribution

| Metric | Value |
|--------|-------|
| Mean | 361.3 |
| Min | 347 |
| Max | 376 |
| SE Mean | 363.4 |
| NI Mean | 360.6 |

### Athletic Sum Thresholds (Key Finding!)

| Threshold | SE Rate | Count | Notes |
|-----------|---------|-------|-------|
| ≥ 358 | 31% | 108 | Above baseline |
| ≥ 360 | 35% | 87 | Good |
| ≥ 362 | 39% | 63 | Good |
| ≥ 364 | 42% | 47 | Strong |
| **≥ 366** | **51%** | **35** | **Excellent sample!** |
| **≥ 368** | **62%** | **24** | **Strong signal** |
| **≥ 370** | **100%** | **8** | **Perfect (small sample)** |

### Athletic Sum Captures

| Threshold | Recruits Captured | SE Captured |
|-----------|-------------------|-------------|
| ≥ 366 | 35 (17%) | 18 (35%) |
| ≥ 368 | 24 (12%) | 15 (29%) |
| ≥ 370 | 8 (4%) | 8 (15%) |

### Athletic Sum by Archetype

| Archetype | SE Mean | NI Mean | Diff |
|-----------|---------|---------|------|
| Bump and Run | 366.3 | 361.8 | +4.5 |
| Zone | 363.2 | 360.9 | +2.3 |
| Field | 363.4 | 359.9 | +3.5 |
| Boundary | 358.4 | 358.3 | +0.1 |

### Athletic Sum Conclusion

**Athletic Sum is a strong predictor:**
- ≥366 = 51% SE (excellent sample size of 35)
- ≥368 = 62% SE (good sample size of 24)
- ≥370 = 100% SE (small but perfect sample of 8)

**Recommendation:** Add Athletic Sum ≥368 as a new rule (62% SE with n=24 is reliable).

---

## Stat Ranges by Archetype

### Boundary (n=44, 21% SE)

| Stat | SE Min | SE Max | NI Min | NI Max | Notes |
|------|--------|--------|--------|--------|-------|
| speed | 90 | 93 | 86 | 93 | **SPD < 90 = 0% SE** |
| acceleration | 90 | 95 | 88 | 96 | Overlap |
| agility | 87 | 93 | 85 | 93 | Overlap |
| change_of_direction | 86 | 92 | 85 | 93 | Overlap |
| man_coverage | 69 | 80 | 68 | 80 | Overlap |
| zone_coverage | 68 | 78 | 68 | 78 | Overlap |

**Key Finding:** Boundary CBs need SPD ≥ 90 minimum to have a chance at Star/Elite.

### Bump and Run (n=49, 33% SE)

| Stat | SE Min | SE Max | NI Min | NI Max | Notes |
|------|--------|--------|--------|--------|-------|
| speed | 88 | 94 | 86 | 93 | Overlap |
| acceleration | 91 | 97 | 89 | 97 | Overlap |
| agility | 88 | 96 | 86 | 94 | Top range differs |
| change_of_direction | 87 | 94 | 85 | 93 | Top range differs |
| awareness | 67 | 73 | 66 | 76 | **AWR ≥ 70 excludes 24% NI, 0% SE** |

**Key Finding:** AGI ≥ 93 rule already captures the top performers.

### Field (n=43, 28% SE)

| Stat | SE Min | SE Max | NI Min | NI Max | Notes |
|------|--------|--------|--------|--------|-------|
| speed | 87 | 93 | 85 | 94 | Overlap |
| acceleration | 91 | 95 | 89 | 96 | Overlap |
| agility | 89 | 94 | 84 | 93 | **AGI < 89 = 0% SE** |
| zone_coverage | 71 | 79 | 68 | 78 | SE higher on avg |
| man_coverage | 70 | 78 | 68 | 78 | Overlap |

**Key Finding:** Field CBs need AGI ≥ 89 minimum to have a chance at Star/Elite.

### Zone (n=61, 23% SE)

| Stat | SE Min | SE Max | NI Min | NI Max | Notes |
|------|--------|--------|--------|--------|-------|
| speed | 88 | 94 | 86 | 93 | Top range differs |
| acceleration | 90 | 96 | 87 | 96 | Overlap |
| change_of_direction | 87 | 93 | 85 | 93 | Overlap |
| zone_coverage | 72 | 79 | 68 | 79 | SE higher floor |

**Key Finding:** COD ≥ 91 rule already captures Zone top performers.

---

## Known Limitations

1. **Boundary archetype** has no strong predictive rules
2. **Small sample sizes** for some rules (e.g., Zone COD>=91 = only 3 recruits)
3. **RF model recall is low** (18% for Star/Elite class)
4. **Mental/ability signals have small samples** (strongest = 3 recruits)
5. **Height + Speed combo** needs more data to confirm (n=20)

---

## Future Improvements

1. Collect more CB data, especially Boundary archetype
2. Analyze mentals and abilities for predictive value
3. Try alternative ML models (XGBoost, etc.)
4. Investigate position-specific thresholds further

---

## Version 2.0 Analysis (n=315 CB)

**Updated: 2026-01-29**

### Model Performance Comparison

| Metric | v1.1 (n=201) | v2.0 (n=315) | Change |
|--------|--------------|--------------|--------|
| **Test AUC-ROC** | 0.697 | **0.732** | **+0.035** |
| **CV AUC-ROC** | 0.633 | 0.639 | +0.006 |
| **CV Variance** | ±0.203 | **±0.162** | **Reduced** |
| Star/Elite Rate | 26% | 32% | +6% |

### Dataset Changes

| Metric | v1.1 | v2.0 |
|--------|------|------|
| Total Recruits | 201 | 315 |
| Star | 41 | 76 |
| Elite | 11 | 25 |
| Star/Elite Total | 52 | 101 |

### Archetype Breakdown v2

| Archetype | Count | SE Rate |
|-----------|-------|---------|
| Zone | 94 | 32% |
| Bump and Run | 82 | 39% |
| Boundary | 69 | 26% |
| Field | 64 | 30% |

### Rules Validation Comparison

| Rule | v1.1 Rate | v1.1 n | v2 Rate | v2 n | Status |
|------|-----------|--------|---------|------|--------|
| Athletic Sum ≥372 | - | - | **100%** | 10 | **NEW** |
| Athletic Sum ≥370 | 100% | 8 | 93% | 15 | Adjusted |
| Athletic Sum ≥368 | 62% | 24 | **65%** | 37 | ✓ Confirmed |
| Athletic Sum ≥366 | 51% | 35 | 54% | 59 | ✓ Confirmed |
| Triple Athletic | 78% | 9 | **85%** | 13 | ✓ Improved |
| B&R AGI≥93 | 100% | 5 | **100%** | 8 | ✓ Confirmed |
| Zone COD≥91 | 100% | 3 | 88% | 8 | Adjusted |
| Zone COD≥90 | - | - | 54% | 28 | **NEW** |
| Green Gem | 44% | 25 | **51%** | 47 | ✓ Improved |
| **Red Gem** | **0%** | 11 | **26%** | 19 | **CHANGED** |
| Field ZC≥78 | 60% | 10 | 44% | 18 | ⚠️ Weakened |
| SPD≥92 + ACC≥94 | 60% | 10 | 57% | 28 | Stable |

### Key Findings v2

**Rules that held or improved:**
- Athletic Sum ≥368 is now our most reliable rule (65% SE, n=37)
- Triple Athletic improved to 85% (n=13)
- B&R AGI≥93 remains perfect at 100% (n=8)
- Green Gem improved to 51% SE

**Rules that need adjustment:**
- Red Gem is NOT as bad as v1 suggested (26% SE vs 0%)
- Field ZC≥78 weakened significantly (44% vs 60%)
- Zone COD≥91 dropped to 88% but still strong

**New discoveries:**
- Athletic Sum ≥372 = 100% SE (n=10) - highest confidence tier
- Zone COD≥90 = 54% SE (n=28) - new moderate rule

### Red Gem Investigation

Red Gem Star/Elite recruits (5 total):
- Alex Hendricks: STAR, Bump and Run (Athletic Sum: 362)
- Juan Hamrick: STAR, Bump and Run (Athletic Sum: 365)
- LARRY WASHINGTON: STAR, Zone (Athletic Sum: 364)
- RASHAWN LOYD: STAR, Boundary (Athletic Sum: 359)
- TREMAINE CHRISTMAS: STAR, Field (Athletic Sum: 349)

**Conclusion:** Red gem doesn't guarantee failure. At 26% SE, it's slightly below baseline (32%) but not catastrophic. Let RF model handle red gems.

---

## Comparison Reference

```
Version 2.0 (n=315 CB) - current
-----------------------------
Test AUC-ROC:    0.732
CV AUC-ROC:      0.639
CV Variance:     ±0.162
Features:        30

Version 1.1 (n=201 CB) - with Athletic Sum
-----------------------------
Test AUC-ROC:    0.697 (+0.039)
CV AUC-ROC:      0.633
Rules Coverage:  ~45%
SE Captured:     ~70%
Features:        30

Version 1.0 (n=202 CB) - baseline
-----------------------------
Test AUC-ROC:    0.658
CV AUC-ROC:      0.638
Rules Coverage:  37%
SE Captured:     63%
Features:        28
```
