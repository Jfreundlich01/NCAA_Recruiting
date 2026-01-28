# Dual Threat Model Version 2 - Stats

**Generated:** 2026-01-28
**Dataset:** recruits_rows.csv (326 total, 137 Dual Threat)
**Model:** RandomForestClassifier (n_estimators=100, class_weight='balanced')

---

## Summary

| Metric | Value |
|--------|-------|
| **Accuracy** | 78.6% |
| **AUC-ROC** | 0.762 |
| **Precision** | 77.8% |
| **Recall** | 63.6% |
| **F1 Score** | 0.700 |

---

## Cross-Validation Results (5-Fold)

| Metric | Mean | Std Dev |
|--------|------|---------|
| Accuracy | 78.2% | ±13.9% |
| AUC-ROC | 0.808 | ±0.163 |

---

## Confusion Matrix

```
                      Predicted
                      N/I      S/E
Actual N/I             15        2
Actual S/E              4        7
```

| Metric | Value |
|--------|-------|
| True Negatives | 15 |
| False Positives | 2 |
| False Negatives | 4 |
| True Positives | 7 |

---

## Dataset Statistics

| Metric | Value |
|--------|-------|
| Total Dual Threat | 137 |
| - QB | 95 |
| - ATH | 42 |
| Training Set | 109 |
| Test Set | 28 |
| Normal/Impact | 83 (60.6%) |
| Star/Elite | 54 (39.4%) |
| Feature Count | 26 |

### Dev Trait Breakdown

| Trait | Count | Percentage |
|-------|-------|------------|
| Normal | 37 | 27.0% |
| Impact | 46 | 33.6% |
| Star | 39 | 28.5% |
| Elite | 15 | 10.9% |

---

## Feature Importance (Top 15)

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | speed | 0.120 |
| 2 | throw_power | 0.105 |
| 3 | break_sack | 0.089 |
| 4 | medium_accuracy | 0.075 |
| 5 | deep_accuracy | 0.067 |
| 6 | short_accuracy | 0.063 |
| 7 | high_stat_count | 0.059 |
| 8 | awareness | 0.058 |
| 9 | acceleration | 0.052 |
| 10 | gem_green | 0.048 |
| 11 | throw_on_run | 0.045 |
| 12 | under_pressure | 0.040 |
| 13 | high_throw_power | 0.031 |
| 14 | high_short_acc | 0.024 |
| 15 | elite_throw_power | 0.022 |

---

## Threshold Analysis

| Threshold | Pred S/E | Precision | Recall |
|-----------|----------|-----------|--------|
| 0.3 | 15 | 60% | 82% |
| 0.4 | 14 | 64% | 82% |
| 0.5 | 10 | 70% | 64% |
| 0.6 | 6 | 83% | 45% |
| 0.7 | 6 | 83% | 45% |
| 0.8 | 5 | 100% | 45% |

---

## Simple Rules Validation

### QB Dual Threat Rules

| Rule | S/E Rate | Count |
|------|----------|-------|
| Throw Power >= 95 | **91%** | 11 |
| Speed >= 83 AND TP >= 90 AND Short Acc >= 78 | **88%** | 16 |
| Speed >= 83 AND Throw Power >= 90 | **83%** | 18 |
| Green Gem AND Throw Power >= 90 | **82%** | 17 |
| Green Gem | 78% | 18 |
| Red Gem (AVOID) | 12% | 8 |
| Baseline (all QB Dual Threat) | 39% | 95 |

### ATH Dual Threat Rules

| Rule | S/E Rate | Count |
|------|----------|-------|
| Green Gem | **80%** | 5 |
| Throw Power >= 88 AND Speed >= 85 | **73%** | 11 |
| Throw Power >= 90 | 54% | 13 |
| Red Gem (AVOID) | **0%** | 5 |
| Baseline (all ATH Dual Threat) | 40% | 42 |

---

## Engineered Features Used

**Universal Threshold Features:**
- elite_throw_power (>=95)
- high_throw_power (>=92)
- good_throw_power (>=90)
- med_throw_power (>=88)
- high_speed (>=85)
- good_speed (>=83)
- high_short_acc (>=78)
- high_awareness (>=70)
- gem_green, gem_red
- high_stat_count (0-4)

**Position-Specific Features:**
- is_qb
- qb_speed_power (QB + speed>=83 + throw_power>=90)
- qb_triple_combo (QB + speed>=83 + throw_power>=90 + short_acc>=78)
- ath_power_speed (ATH + throw_power>=88 + speed>=85)

---

## Recruiting Recommendations

### QB Dual Threat

**MUST RECRUIT (80%+ Star/Elite chance):**
- Throw Power >= 95
- Speed >= 83 AND Throw Power >= 90 AND Short Accuracy >= 78
- Green Gem AND Throw Power >= 90

**STRONG RECRUIT (60-80% Star/Elite chance):**
- Speed >= 83 AND Throw Power >= 90
- Green Gem (any stats)

**AVOID (<15% Star/Elite chance):**
- Red Gem (regardless of stats)

### ATH Dual Threat

**STRONG RECRUIT (70%+ Star/Elite chance):**
- Throw Power >= 88 AND Speed >= 85
- Green Gem

**MODERATE (50-60% Star/Elite chance):**
- Throw Power >= 90

**AVOID (0% Star/Elite chance):**
- Red Gem (regardless of stats)

---

## Model Comparison

| Model | CV AUC | Notes |
|-------|--------|-------|
| **Dual Threat v2** | **0.808** | Best performer |
| Star/Elite v2 (all archetypes) | 0.687 | Generic |
| Has Dev Trait v2 | 0.664 | Generic |

---

## Comparison Reference

```
Version 2 (n=137 Dual Threat)
-----------------------------
Accuracy:    78.6%
AUC-ROC:     0.762 (test) / 0.808 (CV)
Precision:   77.8%
Recall:      63.6%
F1:          0.700
```
