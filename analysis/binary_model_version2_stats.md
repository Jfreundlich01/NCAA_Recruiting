# Binary Model Version 2 - Stats

**Generated:** 2026-01-28
**Dataset:** recruits_rows.csv
**Model:** RandomForestClassifier (n_estimators=100, class_weight='balanced')

---

## Summary

| Metric | Value |
|--------|-------|
| **Accuracy** | 72.7% |
| **AUC-ROC** | 0.664 |
| **Precision** | 70% |
| **Recall** | 32% |
| **F1 Score** | 0.44 |

---

## Cross-Validation Results (5-Fold)

| Metric | Mean | Std Dev |
|--------|------|---------|
| Accuracy | 73.9% | ±10.3% |
| AUC-ROC | 0.687 | ±0.141 |

---

## Confusion Matrix

```
                  Predicted
                  N/I    S/E
Actual N/I         41      3
Actual S/E         15      7
```

| Metric | Value |
|--------|-------|
| True Negatives | 41 |
| False Positives | 3 |
| False Negatives | 15 |
| True Positives | 7 |

---

## Dataset Statistics

| Metric | Value |
|--------|-------|
| Total Recruits | 326 |
| Training Set | 260 |
| Test Set | 66 |
| Normal/Impact | 218 (66.9%) |
| Star/Elite | 108 (33.1%) |
| Feature Count | 16 |

### Dev Trait Breakdown

| Trait | Count | Percentage |
|-------|-------|------------|
| Normal | 92 | 28.2% |
| Impact | 126 | 38.7% |
| Star | 76 | 23.3% |
| Elite | 32 | 9.8% |

### Archetype Breakdown

| Archetype | Count |
|-----------|-------|
| Dual Threat | ~145 |
| Backfield Creator | ~101 |
| Pocket Passer | ~78 |
| Pure Runner | ~2 |

---

## Feature Importance (Ranked)

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | speed | 0.117 |
| 2 | throw_power | 0.110 |
| 3 | acceleration | 0.103 |
| 4 | break_sack | 0.090 |
| 5 | medium_accuracy | 0.088 |
| 6 | short_accuracy | 0.082 |
| 7 | deep_accuracy | 0.080 |
| 8 | awareness | 0.077 |
| 9 | under_pressure | 0.073 |
| 10 | throw_on_run | 0.073 |

---

## Threshold Analysis

| Threshold | Pred Star/Elite | Precision | Recall |
|-----------|-----------------|-----------|--------|
| 0.3 | 25 | 44% | 50% |
| 0.4 | 16 | 50% | 36% |
| 0.5 | 10 | 70% | 32% |
| 0.6 | 4 | 100% | 18% |
| 0.7 | 2 | 100% | 9% |

---

## Comparison: Version 1 vs Version 2

| Metric | V1 (n=222) | V2 (n=326) | Change |
|--------|------------|------------|--------|
| Accuracy | 77.8% | 72.7% | -5.1% |
| AUC-ROC (test) | 0.784 | 0.664 | -0.120 |
| AUC-ROC (CV) | 0.670 | 0.687 | +0.017 |
| Precision | 71.4% | 70% | -1.4% |
| Recall | 38.5% | 32% | -6.5% |
| F1 Score | 0.500 | 0.44 | -0.060 |
| Star/Elite count | 63 | 108 | +45 |

---

## Notes

- Model performance decreased slightly with more data
- CV AUC improved marginally (+0.017), suggesting stable learning
- Test AUC dropped, likely due to harder test set or noisier new data
- Top predictors remain consistent: speed, throw_power, acceleration
- Model is conservative — high precision at threshold 0.6+ but low recall

---

## Comparison Reference

```
Version 2 (n=326)
--------------------------
Accuracy:    72.7%
AUC-ROC:     0.664 (test) / 0.687 (CV)
Precision:   70%
Recall:      32%
F1:          0.44
```
