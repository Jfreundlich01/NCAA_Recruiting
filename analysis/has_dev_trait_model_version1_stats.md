# Has Dev Trait Model Version 1 - Baseline Stats

**Generated:** 2026-01-28
**Dataset:** recruits_rows.csv
**Model:** RandomForestClassifier (n_estimators=100, class_weight='balanced')

---

## Summary

| Metric | Value |
|--------|-------|
| **Accuracy** | 73.3% |
| **AUC-ROC** | 0.728 |
| **Precision** | 73.2% |
| **Recall** | 96.8% |
| **F1 Score** | 0.833 |

---

## Cross-Validation Results (5-Fold)

| Metric | Mean | Std Dev |
|--------|------|---------|
| Accuracy | 70.7% | ±7.5% |
| AUC-ROC | 0.694 | ±0.136 |

---

## Confusion Matrix

```
                      Predicted
                      Normal   Has Dev
Actual Normal            3        11
Actual Has Dev           1        30
```

| Metric | Value |
|--------|-------|
| True Negatives | 3 |
| False Positives | 11 |
| False Negatives | 1 |
| True Positives | 30 |

---

## Dataset Statistics

| Metric | Value |
|--------|-------|
| Total Recruits | 222 |
| Training Set | 177 |
| Test Set | 45 |
| Normal | 69 (31.1%) |
| Has Dev Trait | 153 (68.9%) |
| Feature Count | 16 |

### Dev Trait Breakdown

| Trait | Count | Percentage | Category |
|-------|-------|------------|----------|
| Normal | 69 | 31.1% | Normal |
| Impact | 90 | 40.5% | Has Dev Trait |
| Star | 45 | 20.3% | Has Dev Trait |
| Elite | 18 | 8.1% | Has Dev Trait |

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
| 1 | throw_power | 0.114 |
| 2 | break_sack | 0.102 |
| 3 | short_accuracy | 0.102 |
| 4 | under_pressure | 0.100 |
| 5 | speed | 0.098 |
| 6 | awareness | 0.092 |
| 7 | deep_accuracy | 0.084 |
| 8 | acceleration | 0.077 |
| 9 | medium_accuracy | 0.071 |
| 10 | gem_encoded | 0.066 |
| 11 | throw_on_run | 0.058 |
| 12 | star_rating | 0.023 |
| 13 | arch_Dual Threat | 0.006 |
| 14 | arch_Pocket Passer | 0.004 |
| 15 | arch_Backfield Creator | 0.003 |
| 16 | arch_Pure Runner | 0.000 |

---

## Threshold Analysis

| Threshold | Pred Has Dev | Precision | Recall | Normals Avoided |
|-----------|--------------|-----------|--------|-----------------|
| 0.3 | 45 | 69% | 100% | 0% |
| 0.4 | 43 | 70% | 97% | 7% |
| 0.5 | 41 | 73% | 97% | 21% |
| 0.6 | 33 | 82% | 87% | 57% |
| 0.7 | 25 | 80% | 65% | 64% |

---

## Practical Interpretation

| Scenario | Result |
|----------|--------|
| When model says "Has Dev Trait" | 73% actually do |
| When model says "Normal" | 75% actually are |
| Model catches X% of dev trait recruits | 97% |
| Model correctly avoids X% of Normal | 21% |

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

- Model predicts Normal vs Has Dev Trait (Impact/Star/Elite)
- High recall (96.8%) means model catches almost all recruits with dev traits
- Low normal avoidance (21%) means many Normal recruits slip through
- Raising threshold to 0.6 improves normal avoidance to 57% while still catching 87% of dev trait recruits
- Top predictors: throw_power, break_sack, short_accuracy, under_pressure

---

## Comparison Reference

Use these values to compare against future model versions:

```
Version 1 Baseline (n=222)
--------------------------
Accuracy:    73.3%
AUC-ROC:     0.728 (test) / 0.694 (CV)
Precision:   73.2%
Recall:      96.8%
F1:          0.833
```

---

## Model Comparison: Has Dev Trait vs Star/Elite

| Metric | Has Dev Trait | Star/Elite |
|--------|---------------|------------|
| Accuracy | 73.3% | 77.8% |
| AUC-ROC | 0.728 | 0.784 |
| Precision | 73.2% | 71.4% |
| Recall | **96.8%** | 38.5% |
| F1 Score | **0.833** | 0.500 |

**Use Case Difference:**
- **Star/Elite model**: Conservative, high confidence when it predicts Star/Elite
- **Has Dev Trait model**: Aggressive, catches almost everyone with a dev trait but lets more Normals through
