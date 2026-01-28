/**
 * Offline Prediction Service
 * Hybrid approach: Rules handle ~70% of cases, Neural Network handles ~30%
 * No network required - all predictions run locally
 */

import { RecruitInput, PredictionResult } from './predictionApi';
import { applyRules, getRecommendation, getConfidence } from './predictionEngine';
import {
  engineerDualThreatFeatures,
  engineerBinaryFeatures,
  initNormalizationParams,
} from './featureEngineering';
import {
  initTensorFlow,
  isTensorFlowReady,
  predictDualThreat,
  predictBinary,
  getNormalizationParams,
} from './tensorflowPredictor';

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

  // Initialize TensorFlow and load models
  await initTensorFlow();

  // Pass normalization params to feature engineering
  const dtNorm = getNormalizationParams('dual_threat');
  const binNorm = getNormalizationParams('binary');

  if (dtNorm && binNorm) {
    initNormalizationParams(dtNorm, binNorm);
  }

  isServiceReady = true;
  console.log('Offline prediction service ready');
}

/**
 * Check if the service is ready
 */
export function isOfflinePredictionReady(): boolean {
  return isServiceReady && isTensorFlowReady();
}

/**
 * Normalize features using model's mean/std
 */
function normalizeFeatures(
  features: number[],
  modelType: 'dual_threat' | 'binary'
): number[] {
  const norm = getNormalizationParams(modelType);
  if (!norm) {
    throw new Error(`Normalization params not loaded for ${modelType}`);
  }

  return features.map((val, i) => {
    const std = norm.std[i];
    return (val - norm.mean[i]) / (std === 0 ? 1 : std);
  });
}

/**
 * Predict Star/Elite probability for a single recruit
 * Uses rules first, falls back to neural network for uncertain cases
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
    // No confident rule - use neural network
    if (!isServiceReady) {
      throw new Error('Offline prediction service not initialized');
    }

    if (isDualThreat) {
      const features = engineerDualThreatFeatures(recruit);
      const normalized = normalizeFeatures(features, 'dual_threat');
      probability = await predictDualThreat(normalized);
      modelUsed = 'Dual Threat NN';
    } else {
      const features = engineerBinaryFeatures(recruit);
      const normalized = normalizeFeatures(features, 'binary');
      probability = await predictBinary(normalized);
      modelUsed = 'Binary NN';
    }

    // Apply floors/ceilings to NN output based on gem color
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
 * Apply gem-based floors/ceilings to NN predictions
 */
function applyGemAdjustments(
  probability: number,
  gemColor: string | null | undefined,
  isDualThreat: boolean
): number {
  if (!gemColor) return probability;

  if (isDualThreat) {
    // Dual Threat gem adjustments
    if (gemColor === 'green') {
      // Green gem floor: 78%
      return Math.max(probability, 0.78);
    } else if (gemColor === 'red') {
      // Red gem ceiling: 35%
      return Math.min(probability, 0.35);
    }
  } else {
    // Non-Dual Threat gem adjustments
    if (gemColor === 'green') {
      // Green gem floor: 55%
      return Math.max(probability, 0.55);
    } else if (gemColor === 'red') {
      // Red gem ceiling: 20%
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
  // Process all recruits
  const predictions = await Promise.all(recruits.map(predictRecruit));

  // Sort by probability (highest first)
  predictions.sort((a, b) => b.star_elite_probability - a.star_elite_probability);

  return predictions;
}

/**
 * Quick check for high-confidence recruits using only rules
 * Returns null if neural network is needed
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
