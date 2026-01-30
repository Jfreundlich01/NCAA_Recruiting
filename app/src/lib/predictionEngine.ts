/**
 * Rule-based prediction engine
 * Handles high-confidence cases without needing the neural network
 * Rules derived from training data analysis
 */

import { RecruitInput, PredictionResult } from './predictionApi';

export interface RuleResult {
  probability: number;
  confidence: 'High' | 'Medium' | 'Low';
  ruleApplied: string | null;
  useNeuralNetwork: boolean;
}

/**
 * Apply rule-based logic for high-confidence predictions
 * Returns whether to use the neural network for uncertain cases
 */
export function applyRules(recruit: RecruitInput): RuleResult {
  // Route to position-specific rules
  if (recruit.position === 'CB') {
    return applyCBRules(recruit);
  }
  return applyQBRules(recruit);
}

/**
 * CB-specific rules based on data analysis (v4 - 408 CBs)
 * Rule order: Red Gem → Abilities → Athletic Sum → Archetype+Stat → Combos → Fallback
 */
function applyCBRules(recruit: RecruitInput): RuleResult {
  const stats = recruit.stats as Record<string, number>;
  const cod = stats.change_of_direction || 0;
  const acc = stats.acceleration || 0;
  const agi = stats.agility || 0;
  const spd = stats.speed || 0;
  const man = stats.man_coverage || 0;
  const zc = stats.zone_coverage || 0;
  const archetype = recruit.archetype || '';
  const abilities = recruit.abilities || [];
  const athleticSum = spd + acc + agi + cod;

  // === 1. RED GEM CHECK (first - 16% SE in v4 data, n=32) ===
  // Red gem overrules all other positive signals
  if (recruit.gem_color === 'red') {
    return {
      probability: 0.20,
      confidence: 'High',
      ruleApplied: 'CB Red Gem → 20% ceiling',
      useNeuralNetwork: false,
    };
  }

  // === 2. FIELD + SLOW CHECK (18% SE in v4 data, n=40) ===
  // Almost as bad as red gem - check early
  if (archetype === 'Field' && spd < 87) {
    return {
      probability: 0.20,
      confidence: 'High',
      ruleApplied: 'CB Field + Slow → 20% ceiling',
      useNeuralNetwork: false,
    };
  }

  // === 3. ABILITY RULES (100% SE without red gem, n=7) ===
  const hasJammer = abilities.includes('Jammer');
  const hasRobber = abilities.includes('Robber');
  if (hasJammer || hasRobber) {
    const abilityName = hasJammer ? 'Jammer' : 'Robber';
    return {
      probability: 0.95,
      confidence: 'High',
      ruleApplied: `CB ${abilityName} Ability → 95%`,
      useNeuralNetwork: false,
    };
  }

  // === 3. ATHLETIC SUM RULES ===

  // Athletic Sum ≥372 = 100% in v4 data (n=11)
  if (athleticSum >= 372) {
    return {
      probability: 0.95,
      confidence: 'High',
      ruleApplied: 'CB Athletic Sum ≥372 → 95%',
      useNeuralNetwork: false,
    };
  }

  // Athletic Sum ≥370 = 89% in v4 data (n=19)
  if (athleticSum >= 370) {
    return {
      probability: 0.85,
      confidence: 'High',
      ruleApplied: 'CB Athletic Sum ≥370 → 85%',
      useNeuralNetwork: false,
    };
  }

  // === 4. ARCHETYPE + STAT RULES (100% SE without red gem) ===

  // Bump and Run: AGI≥93 = 100% SE (n=8)
  if (archetype === 'Bump and Run' && agi >= 93) {
    return {
      probability: 0.90,
      confidence: 'High',
      ruleApplied: 'CB B&R + Elite AGI ≥93 → 90%',
      useNeuralNetwork: false,
    };
  }

  // Zone: AGI≥93 = 100% SE (n=6)
  if (archetype === 'Zone' && agi >= 93) {
    return {
      probability: 0.90,
      confidence: 'High',
      ruleApplied: 'CB Zone + Elite AGI ≥93 → 90%',
      useNeuralNetwork: false,
    };
  }

  // Zone: COD≥91 = 100% SE (n=10) - strong rule!
  if (archetype === 'Zone' && cod >= 91) {
    return {
      probability: 0.90,
      confidence: 'High',
      ruleApplied: 'CB Zone + COD ≥91 → 90%',
      useNeuralNetwork: false,
    };
  }

  // === 5. GEM + ARCHETYPE RULES ===

  // Zone + Green = 71% SE (n=17)
  if (archetype === 'Zone' && recruit.gem_color === 'green') {
    return {
      probability: 0.70,
      confidence: 'High',
      ruleApplied: 'CB Zone + Green Gem → 70%',
      useNeuralNetwork: false,
    };
  }

  // B&R + Green = 65% SE (n=17)
  if (archetype === 'Bump and Run' && recruit.gem_color === 'green') {
    return {
      probability: 0.65,
      confidence: 'Medium',
      ruleApplied: 'CB B&R + Green Gem → 65%',
      useNeuralNetwork: false,
    };
  }

  // === 6. COMBO RULES ===

  // COD≥91 + ACC≥94 = 67% in v4 data (n=36)
  if (cod >= 91 && acc >= 94) {
    return {
      probability: 0.65,
      confidence: 'Medium',
      ruleApplied: 'CB COD+Acc Combo → 65%',
      useNeuralNetwork: false,
    };
  }

  // ACC≥94 + AGI≥91 = 65% in v4 data (n=37)
  if (acc >= 94 && agi >= 91) {
    return {
      probability: 0.65,
      confidence: 'Medium',
      ruleApplied: 'CB Acc+Agi Combo → 65%',
      useNeuralNetwork: false,
    };
  }


  // === 7. GLOBAL GREEN GEM ===

  // Green Gem = 57% SE in v4 data (n=58)
  if (recruit.gem_color === 'green') {
    return {
      probability: 0.55,
      confidence: 'Medium',
      ruleApplied: 'CB Green Gem → 55%',
      useNeuralNetwork: false,
    };
  }

  // === 8. FALLBACK - Use RF model ===
  return {
    probability: 0.5,
    confidence: 'Low',
    ruleApplied: null,
    useNeuralNetwork: true,
  };
}


/**
 * QB-specific rules based on data analysis
 */
function applyQBRules(recruit: RecruitInput): RuleResult {
  const tp = recruit.stats.throw_power || 0;
  const spd = recruit.stats.speed || 0;
  const sa = recruit.stats.short_accuracy || 0;
  const isQB = recruit.position === 'QB';
  const isDualThreat = recruit.archetype === 'Dual Threat';

  // === DUAL THREAT RULES ===
  if (isDualThreat) {
    // TP >= 95 + Green Gem = 95% floor (highest confidence)
    if (tp >= 95 && recruit.gem_color === 'green') {
      return {
        probability: 0.95,
        confidence: 'High',
        ruleApplied: 'TP>=95 + Green Gem → 95% floor',
        useNeuralNetwork: false,
      };
    }

    // TP >= 95 = 91% floor (91% of such recruits are Star/Elite in training data)
    if (tp >= 95) {
      return {
        probability: 0.91,
        confidence: 'High',
        ruleApplied: 'TP>=95 → 91% floor',
        useNeuralNetwork: false,
      };
    }

    // QB Triple Combo (TP>=90 + SPD>=83 + SA>=78) = 87.5% in data
    if (isQB && tp >= 90 && spd >= 83 && sa >= 78) {
      const prob = recruit.gem_color === 'green' ? 0.90 : 0.85;
      return {
        probability: prob,
        confidence: 'High',
        ruleApplied: recruit.gem_color === 'green'
          ? 'QB Triple Combo + Green → 90% floor'
          : 'QB Triple Combo → 85% floor',
        useNeuralNetwork: false,
      };
    }

    // Green gem alone = 78% in data
    if (recruit.gem_color === 'green') {
      return {
        probability: 0.78,
        confidence: 'Medium',
        ruleApplied: 'Green Gem → 78% floor',
        useNeuralNetwork: false,
      };
    }

    // Red gem = ceiling at 35%
    if (recruit.gem_color === 'red') {
      return {
        probability: 0.35,
        confidence: 'High',
        ruleApplied: 'Red Gem → 35% ceiling',
        useNeuralNetwork: false,
      };
    }
  }

  // === NON-DUAL THREAT RULES (Pocket Passer, Backfield Creator) ===
  else {
    // Green gem boost
    if (recruit.gem_color === 'green') {
      return {
        probability: 0.55,
        confidence: 'Medium',
        ruleApplied: 'Green Gem (non-DT) → 55% floor',
        useNeuralNetwork: false,
      };
    }

    // Red gem penalty
    if (recruit.gem_color === 'red') {
      return {
        probability: 0.20,
        confidence: 'High',
        ruleApplied: 'Red Gem (non-DT) → 20% ceiling',
        useNeuralNetwork: false,
      };
    }
  }

  // No high-confidence rule applies - use neural network
  return {
    probability: 0.5, // placeholder, will be replaced by NN
    confidence: 'Low',
    ruleApplied: null,
    useNeuralNetwork: true,
  };
}

/**
 * Get recommendation text based on probability and gem color
 * High probability from rules (like Jammer/Robber) overrides red gem concern
 */
export function getRecommendation(prob: number, gemColor: string | null): string {
  // High probability overrides red gem (e.g., Jammer/Robber ability)
  if (prob >= 0.80) {
    return gemColor === 'red'
      ? 'MUST RECRUIT: Ability overrides red gem!'
      : 'MUST RECRUIT: Very high Star/Elite probability';
  } else if (prob >= 0.65) {
    return gemColor === 'red'
      ? 'STRONG RECRUIT: High stats overcome red gem'
      : 'STRONG RECRUIT: Good Star/Elite probability';
  }

  // Red gem warning for lower probabilities
  if (gemColor === 'red') {
    return 'CAUTION: Red gem, below average potential';
  }

  if (prob >= 0.50) {
    return 'MODERATE: Decent chance, consider other factors';
  } else if (prob >= 0.35) {
    return 'RISKY: Below average Star/Elite probability';
  } else {
    return 'AVOID: Low Star/Elite probability';
  }
}

/**
 * Get confidence level from probability
 */
export function getConfidence(prob: number): 'High' | 'Medium' | 'Low' {
  if (prob >= 0.75 || prob <= 0.25) {
    return 'High';
  } else if (prob >= 0.60 || prob <= 0.40) {
    return 'Medium';
  } else {
    return 'Low';
  }
}
