/**
 * Offline Prediction Service
 * Hybrid approach: Rules handle ~70% of cases, Random Forest handles ~30%
 * No network required - all predictions run locally
 */

import { RecruitInput, PredictionResult } from './predictionApi';
import { applyRules, getRecommendation, getConfidence } from './predictionEngine';
import {
  engineerDualThreatFeatures,
  engineerBinaryFeatures,
} from './featureEngineering';
import {
  initRandomForest,
  isRandomForestReady,
  predictDualThreat,
  predictBinary,
} from './randomForestPredictor';

let isServiceReady = false;

/**
 * Initialize the offline prediction service
 * Call this once at app startup
 */
export async function initOfflinePrediction(): Promise<void> {
  if (isServiceReady) {
    console.log('Offline prediction already initialized');
    return;
  }

  console.log('Initializing offline prediction service...');

  // Initialize Random Forest models
  await initRandomForest();

  isServiceReady = true;
  console.log('Offline prediction service ready (Random Forest)');
}

/**
 * Check if the service is ready
 */
export function isOfflinePredictionReady(): boolean {
  return isServiceReady && isRandomForestReady();
}

/**
 * Predict Star/Elite probability for a single recruit
 * Uses rules first, falls back to Random Forest for uncertain cases
 */
export async function predictRecruit(recruit: RecruitInput): Promise<PredictionResult> {
  const isDualThreat = recruit.archetype === 'Dual Threat';

  // Step 1: Try rule-based prediction first
  const ruleResult = applyRules(recruit);

  let probability: number;
  let modelUsed: string;

  if (!ruleResult.useNeuralNetwork) {
    // Rule applied - use rule-based probability
    probability = ruleResult.probability;
    modelUsed = `Rule: ${ruleResult.ruleApplied}`;
  } else {
    // No confident rule - use Random Forest
    if (!isServiceReady) {
      throw new Error('Offline prediction service not initialized');
    }

    if (isDualThreat) {
      // Get raw features (RF doesn't need normalization)
      const features = engineerDualThreatFeatures(recruit);
      probability = await predictDualThreat(features);
      modelUsed = 'Dual Threat RF (100 trees)';
    } else {
      const features = engineerBinaryFeatures(recruit);
      probability = await predictBinary(features);
      modelUsed = 'Binary RF (100 trees)';
    }

    // Apply floors/ceilings to RF output based on gem color
    probability = applyGemAdjustments(probability, recruit.gem_color, isDualThreat);
  }

  // Clamp probability to [0, 1]
  probability = Math.max(0, Math.min(1, probability));

  return {
    name: recruit.name,
    position: recruit.position,
    archetype: recruit.archetype,
    star_elite_probability: probability,
    star_elite_percentage: Math.round(probability * 100),
    recommendation: getRecommendation(probability, recruit.gem_color || null),
    confidence: getConfidence(probability),
    ml_model: modelUsed,
  };
}

/**
 * Apply gem-based floors/ceilings to RF predictions
 */
function applyGemAdjustments(
  probability: number,
  gemColor: string | null | undefined,
  isDualThreat: boolean
): number {
  if (!gemColor) return probability;

  if (isDualThreat) {
    if (gemColor === 'green') {
      return Math.max(probability, 0.78);
    } else if (gemColor === 'red') {
      return Math.min(probability, 0.35);
    }
  } else {
    if (gemColor === 'green') {
      return Math.max(probability, 0.55);
    } else if (gemColor === 'red') {
      return Math.min(probability, 0.20);
    }
  }

  return probability;
}

/**
 * Predict Star/Elite probability for multiple recruits (batch)
 * Returns predictions sorted by probability (highest first)
 */
export async function predictRecruitsBatch(
  recruits: RecruitInput[]
): Promise<PredictionResult[]> {
  const predictions = await Promise.all(recruits.map(predictRecruit));
  predictions.sort((a, b) => b.star_elite_probability - a.star_elite_probability);
  return predictions;
}

/**
 * Quick check for high-confidence recruits using only rules
 * Returns null if Random Forest is needed
 */
export function quickRuleCheck(
  recruit: RecruitInput
): { probability: number; rule: string } | null {
  const ruleResult = applyRules(recruit);

  if (!ruleResult.useNeuralNetwork && ruleResult.ruleApplied) {
    return {
      probability: ruleResult.probability,
      rule: ruleResult.ruleApplied,
    };
  }

  return null;
}
