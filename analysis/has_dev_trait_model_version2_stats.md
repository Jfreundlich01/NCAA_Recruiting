# Has Dev Trait Model Version 2 - Stats

**Generated:** 2026-01-28
**Dataset:** recruits_rows.csv
**Model:** RandomForestClassifier (n_estimators=100, class_weight='balanced')

---

## Summary

| Metric | Value |
|--------|-------|
| **Accuracy** | 71.2% |
| **AUC-ROC** | 0.673 |
| **Precision** | 73.3% |
| **Recall** | 93.6% |
| **F1 Score** | 0.822 |

---

## Cross-Validation Results (5-Fold)

| Metric | Mean | Std Dev |
|--------|------|---------|
| Accuracy | 70.5% | ±3.2% |
| AUC-ROC | 0.664 | ±0.147 |

---

## Confusion Matrix

```
                      Predicted
                      Normal   Has Dev
Actual Normal            3        16
Actual Has Dev           3        44
```

| Metric | Value |
|--------|-------|
| True Negatives | 3 |
| False Positives | 16 |
| False Negatives | 3 |
| True Positives | 44 |

---

## Dataset Statistics

| Metric | Value |
|--------|-------|
| Total Recruits | 326 |
| Training Set | 260 |
| Test Set | 66 |
| Normal | 92 (28.2%) |
| Has Dev Trait | 234 (71.8%) |
| Feature Count | 16 |

### Dev Trait Breakdown

| Trait | Count | Percentage | Category |
|-------|-------|------------|----------|
| Normal | 92 | 28.2% | Normal |
| Impact | 126 | 38.7% | Has Dev Trait |
| Star | 76 | 23.3% | Has Dev Trait |
| Elite | 32 | 9.8% | Has Dev Trait |

---

## Feature Importance (Ranked)

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | speed | 0.117 |
| 2 | deep_accuracy | 0.104 |
| 3 | awareness | 0.104 |
| 4 | throw_power | 0.104 |
| 5 | short_accuracy | 0.088 |
| 6 | break_sack | 0.086 |
| 7 | medium_accuracy | 0.082 |
| 8 | throw_on_run | 0.078 |
| 9 | under_pressure | 0.077 |
| 10 | acceleration | 0.071 |

---

## Threshold Analysis

| Threshold | Pred Has Dev | Precision | Recall | Normals Avoided |
|-----------|--------------|-----------|--------|-----------------|
| 0.3 | 64 | 70% | 96% | 0% |
| 0.4 | 62 | 71% | 94% | 5% |
| 0.5 | 61 | 72% | 94% | 11% |
| 0.6 | 56 | 75% | 89% | 26% |
| 0.7 | 50 | 74% | 79% | 32% |

---

## Practical Interpretation

| Scenario | Result |
|----------|--------|
| When model says "Has Dev Trait" | 73% actually do |
| When model says "Normal" | 50% actually are |
| Model catches X% of dev trait recruits | 94% |
| Model correctly avoids X% of Normal | 16% |

---

## Comparison: Version 1 vs Version 2

| Metric | V1 (n=222) | V2 (n=326) | Change |
|--------|------------|------------|--------|
| Accuracy | 73.3% | 71.2% | -2.1% |
| AUC-ROC (test) | 0.728 | 0.673 | -0.055 |
| AUC-ROC (CV) | 0.694 | 0.664 | -0.030 |
| Precision | 73.2% | 73.3% | +0.1% |
| Recall | 96.8% | 93.6% | -3.2% |
| F1 Score | 0.833 | 0.822 | -0.011 |
| Normal count | 69 | 92 | +23 |
| Has Dev Trait count | 153 | 234 | +81 |

---

## Notes

- Model performance slightly decreased with more data
- Recall remains high (94%) — still catches most recruits with dev traits
- Normal avoidance dropped from 21% to 16%
- Precision held steady at ~73%
- CV accuracy variance decreased (±3.2% vs ±7.5%), indicating more stable predictions
- Top predictors: speed, deep_accuracy, awareness, throw_power

---

## Comparison Reference

```
Version 2 (n=326)
--------------------------
Accuracy:    71.2%
AUC-ROC:     0.673 (test) / 0.664 (CV)
Precision:   73.3%
Recall:      93.6%
F1:          0.822
```
