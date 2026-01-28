# Binary Model Version 1 - Baseline Stats

**Generated:** 2026-01-28
**Dataset:** recruits_rows.csv
**Model:** RandomForestClassifier (n_estimators=100, class_weight='balanced')

---

## Summary

| Metric | Value |
|--------|-------|
| **Accuracy** | 77.8% |
| **AUC-ROC** | 0.784 |
| **Precision** | 71.4% |
| **Recall** | 38.5% |
| **F1 Score** | 0.500 |

---

## Cross-Validation Results (5-Fold)

| Metric | Mean | Std Dev |
|--------|------|---------|
| Accuracy | 77.9% | ±2.7% |
| AUC-ROC | 0.670 | ±0.056 |

---

## Confusion Matrix

```
                    Predicted
                    N/I     S/E
Actual N/I          30       2
Actual S/E           8       5
```

| Metric | Value |
|--------|-------|
| True Negatives | 30 |
| False Positives | 2 |
| False Negatives | 8 |
| True Positives | 5 |

---

## Dataset Statistics

| Metric | Value |
|--------|-------|
| Total Recruits | 222 |
| Training Set | 177 |
| Test Set | 45 |
| Normal/Impact | 159 (71.6%) |
| Star/Elite | 63 (28.4%) |
| Feature Count | 16 |

### Dev Trait Breakdown

| Trait | Count | Percentage |
|-------|-------|------------|
| Normal | 69 | 31.1% |
| Impact | 90 | 40.5% |
| Star | 45 | 20.3% |
| Elite | 18 | 8.1% |

### Archetype Breakdown

| Archetype | Count | Percentage |
|-----------|-------|------------|
| Dual Threat | 99 | 44.6% |
| Backfield Creator | 69 | 31.1% |
| Pocket Passer | 53 | 23.9% |
| Pure Runner | 1 | 0.5% |

---

## Feature Importance (Ranked)

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | speed | 0.130 |
| 2 | throw_power | 0.108 |
| 3 | short_accuracy | 0.105 |
| 4 | acceleration | 0.098 |
| 5 | break_sack | 0.090 |
| 6 | awareness | 0.077 |
| 7 | deep_accuracy | 0.075 |
| 8 | throw_on_run | 0.074 |
| 9 | under_pressure | 0.070 |
| 10 | medium_accuracy | 0.070 |
| 11 | gem_encoded | 0.054 |
| 12 | star_rating | 0.034 |
| 13 | arch_Dual Threat | 0.005 |
| 14 | arch_Backfield Creator | 0.004 |
| 15 | arch_Pocket Passer | 0.003 |
| 16 | arch_Pure Runner | 0.000 |

---

## Features Used

**Stat Features (10):**
- awareness, throw_power, short_accuracy, medium_accuracy, deep_accuracy
- throw_on_run, under_pressure, break_sack, speed, acceleration

**Other Features (6):**
- star_rating
- gem_encoded (green=1, red=-1, none=0)
- arch_Dual Threat, arch_Backfield Creator, arch_Pocket Passer, arch_Pure Runner

---

## Notes

- Model predicts Star/Elite vs Normal/Impact (binary classification)
- High accuracy (77.8%) but low recall (38.5%) means model is conservative
- Model correctly identifies Normal/Impact recruits well (30/32 = 94%)
- Model misses many Star/Elite recruits (only catches 5/13 = 38%)
- Top predictors: speed, throw_power, short_accuracy
- Archetype features have minimal importance in pooled model

---

## Comparison Reference

Use these values to compare against future model versions:

```
Version 1 Baseline (n=222)
--------------------------
Accuracy:    77.8%
AUC-ROC:     0.784 (test) / 0.670 (CV)
Precision:   71.4%
Recall:      38.5%
F1:          0.500
```
