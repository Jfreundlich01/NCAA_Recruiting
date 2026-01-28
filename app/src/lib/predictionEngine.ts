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
 */
export function getRecommendation(prob: number, gemColor: string | null): string {
  if (gemColor === 'red') {
    return 'AVOID: Red gem indicates low potential';
  }

  if (prob >= 0.80) {
    return 'MUST RECRUIT: Very high Star/Elite probability';
  } else if (prob >= 0.65) {
    return 'STRONG RECRUIT: Good Star/Elite probability';
  } else if (prob >= 0.50) {
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
