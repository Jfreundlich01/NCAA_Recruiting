# Recruits to Verify

Track recruits with interesting predictions to verify once we have more data.

---

## Added 2026-01-28

### Emmanuel Ferrell
- **Position:** QB
- **Archetype:** Dual Threat
- **Star Rating:** 5
- **Gem:** Green
- **Prediction:** 95% Star/Elite
- **Rule Applied:** TP>=95 + Green Gem → 95% floor

**Stats:**
| Stat | Value |
|------|-------|
| Throw Power | 98 |
| Speed | 85 |
| Short Accuracy | 80 |
| Awareness | 72 |
| Acceleration | 88 |
| Medium Accuracy | 81 |
| Deep Accuracy | 69 |
| Throw on Run | 82 |
| Under Pressure | 77 |
| Break Sack | 66 |

**Notes:** Elite throw power (98) + green gem. Model gave 94%, rule bumped to 95%. Should be near-guaranteed Star/Elite based on historical data (TP>=95 = 92.3%).

**Actual Outcome:** _pending_

---

### Tyron Trimble
- **Position:** ATH
- **Archetype:** Dual Threat
- **Star Rating:** 4
- **Gem:** None
- **Prediction:** 96% Star/Elite
- **Rule Applied:** None (model probability)

**Stats:**
| Stat | Value |
|------|-------|
| Throw Power | 94 |
| Speed | 86 |
| Short Accuracy | 85 |
| Awareness | 70 |
| Acceleration | 92 |
| Medium Accuracy | 81 |
| Deep Accuracy | 81 |
| Throw on Run | 76 |
| Under Pressure | 79 |
| Break Sack | 76 |

**Notes:** Ranked higher than Ferrell despite lower TP because ATH Dual Threats with TP 92-94 are 100% Star/Elite in training data (4/4). Small sample size - may regress with more data. Model weighted his high raw stats (SPD 86, SA 85, ACC 92).

**Actual Outcome:** _pending_

---

## Comparison Notes

These two recruits highlight a model behavior: ATH Dual Threats with TP 92-94 have 100% Star/Elite rate in current data (n=4), which may be overfitting. With more ATH data, expect the model to better differentiate elite QB prospects (TP>=95 + green gem) from ATH prospects.

Check back after adding ~50 more Dual Threat recruits to see if predictions hold.
