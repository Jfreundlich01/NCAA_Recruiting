# CB Model Version 5 Analysis

**Date:** January 30, 2025
**Dataset:** 501 CBs (up from 408 in v4)
**Baseline Star/Elite Rate:** 33.7% (169/501)

---

## Model Performance Comparison

| Metric | v4 (408 CBs) | v5 (501 CBs) | Change |
|--------|--------------|--------------|--------|
| Test AUC-ROC | 0.660 | **0.818** | +24% |
| CV AUC-ROC | 0.650 | **0.699** | +7.5% |
| CV Std Dev | ±0.031 | ±0.036 | Similar |

**Notes:**
- Significant improvement in test AUC (+0.158)
- CV AUC also improved, indicating better generalization
- Model is more reliable with larger dataset

---

## Class Distribution

| Dev Trait | Count | Percentage |
|-----------|-------|------------|
| Star/Elite | 169 | 33.7% |
| Normal/Impact | 332 | 66.3% |

### Archetype Breakdown

| Archetype | Count | SE Rate |
|-----------|-------|---------|
| Bump and Run | 123 | 40.7% |
| Zone | 147 | 34.0% |
| Boundary | 112 | 31.2% |
| Field | 113 | 28.3% |

---

## Rule Validation Results

### Negative Rules (AVOID)

| Rule | n | SE Rate | 95% CI | Action |
|------|---|---------|--------|--------|
| Red Gem (all) | 40 | 12% | [5%, 26%] | → Cap at 20% |
| Field + Slow (SPD<87) | 55 | 16% | [9%, 28%] | → Cap at 20% |

**Total AVOID:** 89 CBs, 15% SE rate (less than half baseline!)

### Positive Rules (Excluding Red Gems - 461 CBs, 35.6% baseline)

#### Ability Rules (100% SE)
| Rule | n | SE Rate | 95% CI |
|------|---|---------|--------|
| Jammer Ability | 7 | 100% | [65%, 100%] |
| Robber Ability | 2 | 100% | [34%, 100%] |

#### Athletic Sum Rules
| Rule | n | SE Rate | 95% CI |
|------|---|---------|--------|
| Athletic Sum ≥372 | 16 | 100% | [81%, 100%] |
| Athletic Sum ≥370 | 28 | 93% | [77%, 98%] |
| Athletic Sum ≥368 | 59 | 68% | [55%, 78%] |

#### Archetype + Stat Rules (All 100% SE)
| Rule | n | SE Rate | 95% CI |
|------|---|---------|--------|
| B&R + AGI≥93 | 10 | 100% | [72%, 100%] |
| Zone + AGI≥93 | 8 | 100% | [68%, 100%] |
| Zone + COD≥91 | 13 | 100% | [77%, 100%] |

#### Gem + Archetype Rules
| Rule | n | SE Rate | 95% CI |
|------|---|---------|--------|
| Zone + Green Gem | 26 | 69% | [50%, 83%] |
| B&R + Green Gem | 19 | 68% | [46%, 85%] |

#### Combo Rules (UNDERPERFORMING)
| Rule | n | SE Rate | 95% CI | Status |
|------|---|---------|--------|--------|
| COD≥91 + ACC≥94 | 46 | 67% | [53%, 79%] | ⚠️ Raw looks ok |
| ACC≥94 + AGI≥91 | 48 | 67% | [53%, 78%] | ⚠️ Raw looks ok |

**Note:** These rules look ok in isolation but perform poorly as T3 (37% after T1/T2 take best recruits).

#### Global Green Gem
| Rule | n | SE Rate | 95% CI |
|------|---|---------|--------|
| Green Gem (any) | 75 | 61% | [50%, 72%] |

---

## Tier Analysis (Mutually Exclusive)

| Tier | n | SE | Rate | 95% CI | Lift | Capture |
|------|---|----|----- |--------|------|---------|
| **AVOID** | 89 | 13 | 15% | [9%, 23%] | 0.4x | 8% |
| **T1** | 40 | 38 | **95%** | [83%, 99%] | 2.8x | 22% |
| **T2** | 35 | 22 | **63%** | [46%, 77%] | 1.9x | 13% |
| **T3** | 30 | 11 | **37%** | [22%, 54%] | 1.1x | 7% |
| **T4** | 28 | 13 | **46%** | [30%, 64%] | 1.4x | 8% |
| **RF** | 279 | 72 | 26% | [21%, 31%] | 0.8x | 43% |

### Cumulative Tier Performance

| Tiers | n | SE | Rate | 95% CI | Capture |
|-------|---|----|----- |--------|---------|
| T1 only | 40 | 38 | **95%** | [83%, 99%] | 22% |
| T1 + T2 | 75 | 60 | **80%** | [70%, 87%] | 36% |
| T1 + T2 + T3 | 105 | 71 | **68%** | [58%, 76%] | 42% |
| T1 + T2 + T3 + T4 | 133 | 84 | **63%** | [55%, 71%] | 50% |

---

## T3 Combo Rules Problem

**Issue:** T3 rules (COD+Acc, Acc+Agi combos) are only hitting 37% in tier analysis.

**Why:** The best recruits matching these combos are already captured by T1 rules (Athletic Sum, Archetype+Stat). The "leftovers" that reach T3 are weaker.

**Evidence:**
- Raw combo rule: 67% SE
- After T1/T2 capture: Only 37% SE
- Live test data: 2/7 = 29% (matches)

**Recommendation:** Consider removing T3 or letting RF handle these cases.

---

## Statistical Significance

| Category | n | SE | Rate |
|----------|---|----|----- |
| Positive Tiers (T1-T4) | 133 | 84 | 63% |
| AVOID Tier | 89 | 13 | 15% |
| RF Fallback | 279 | 72 | 26% |

**Chi-square Test (Positive vs RF):**
- Chi-square: 51.8
- p-value: 6.05e-13
- **Highly statistically significant (p < 0.001)**

---

## Confidence Assessment

### Positive Tiers Combined
- Rate: 63%
- 95% CI: [55%, 71%]
- CI Lower Bound: 55%
- Baseline: 34%
- **Margin above baseline: +21pp (even worst case)**

### T1 Specifically
- Rate: 95%
- 95% CI: [83%, 99%]
- **Even worst case (83%) is 2.5x baseline**

### Verdict
✅ **CONFIDENT:** The ruleset works. Even the worst-case confidence interval beats baseline significantly.

---

## Top 10 Feature Importance (RF Model v5)

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | catching | 0.104 |
| 2 | speed | 0.088 |
| 3 | man_coverage | 0.074 |
| 4 | tackle | 0.070 |
| 5 | agility | 0.068 |
| 6 | press | 0.066 |
| 7 | change_of_direction | 0.064 |
| 8 | gem_green | 0.062 |
| 9 | awareness | 0.062 |
| 10 | zone_coverage | 0.057 |

---

## Final Rule Structure (v5)

```
1. RED GEM CHECK (first - overrules everything)
   - Red Gem → Cap at 20%

2. FIELD + SLOW CHECK (second)
   - Field archetype + SPD<87 → Cap at 20%

3. ABILITY RULES (100% SE)
   - Jammer → 95%
   - Robber → 95%

4. ATHLETIC SUM RULES
   - Athletic Sum ≥372 → 95%
   - Athletic Sum ≥370 → 85%

5. ARCHETYPE + STAT RULES (100% SE)
   - B&R + AGI≥93 → 90%
   - Zone + AGI≥93 → 90%
   - Zone + COD≥91 → 90%

6. GEM + ARCHETYPE RULES
   - Zone + Green → 70%
   - B&R + Green → 65%

7. COMBO RULES (⚠️ UNDERPERFORMING - CONSIDER REMOVAL)
   - COD+Acc (COD≥91 + ACC≥94) → 65%
   - Acc+Agi (ACC≥94 + AGI≥91) → 65%

8. GLOBAL GEM RULE
   - Green Gem → 55%

9. FALLBACK
   - No rule match → Use RF model
```

---

## Changes from v4

1. **Dataset expanded:** 408 → 501 CBs (+23%)
2. **RF Model significantly improved:** Test AUC 0.660 → 0.818
3. **T1 rules holding strong:** 95% hit rate confirmed
4. **T3 combo rules underperforming:** 37% in practice vs 68% expected
5. **Confidence intervals tighter:** Larger sample = more certainty
6. **Red gem confirmed:** 12% SE (was 16% in v4)

---

## Recommended Actions

1. ✅ Keep T1 rules (95% hit rate, rock solid)
2. ✅ Keep T2 rules (63%, still 2x baseline)
3. ⚠️ Consider removing T3 combo rules (37% = barely above baseline)
4. ✅ Keep T4 green gem (46%, RF handles rest)
5. ✅ Trust RF model for edge cases (improved significantly)

---

## Statistical Significance vs Confidence Intervals

**Two different questions:**

| Question | Answer | What It Tells You |
|----------|--------|-------------------|
| "Is this real or luck?" | p-value | Statistical significance |
| "What's the actual hit rate?" | Confidence interval | The range of true values |

### Tier-by-Tier Statistical Significance

| Tier | Hit Rate | p-value | Confidence It's Real |
|------|----------|---------|---------------------|
| **T1** | 95% (38/40) | 3.95e-16 | >99.9999999% |
| **T2** | 63% (22/35) | 0.000395 | 99.96% |
| **T1+T2** | 80% (60/75) | 2.49e-16 | >99.9999999% |

**Translation:**
- T1: Less than 1-in-a-trillion chance results are luck
- T2: Less than 1-in-2,500 chance results are luck
- Combined: The pattern is absolutely real

### Conservative Claims (95% CI Lower Bounds)

| Tier | Observed Rate | 95% CI | Conservative Claim |
|------|---------------|--------|-------------------|
| **T1** | 95% | [83%, 99%] | "At least 83% hit rate" |
| **T2** | 63% | [46%, 77%] | "At least 46% hit rate" |
| **T1+T2** | 80% | [70%, 87%] | "At least 70% hit rate" |
| **AVOID** | 15% | [9%, 23%] | "At most 23% hit rate" |

---

## What You Can Confidently Claim

### Marketing-Safe Claims (backed by 95% CI)

1. **"T1 recruits hit Star/Elite at least 83% of the time"** - worst-case CI
2. **"T1+T2 together give at least 70% hit rate - 2x better than random"**
3. **"AVOID recruits hit at most 23% - below baseline"**
4. **"We're 99.99%+ confident these patterns are real, not luck"**

### How the Numbers Work Together

```
STEP 1: Is the pattern real?
  → p-value: YES, 99.9999999% sure it's not luck

STEP 2: What's the actual hit rate?
  → Best estimate: 80% (T1+T2)
  → Worst case (95% CI): 70%
  → Still 2x better than baseline (34%)
```

### The Bottom Line

- **99.9999999%** = confidence the effect is REAL
- **70-87%** = the range where the TRUE hit rate probably falls
- **2x baseline** = even worst-case is twice as good as random
