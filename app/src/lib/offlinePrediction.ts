/**
 * Offline Prediction Service
 * Hybrid approach: Rules handle ~70% of cases, Random Forest handles ~30%
 * No network required - all predictions run locally
 */

import { RecruitInput, PredictionResult } from './predictionApi';
import { applyRules, getRecommendation, getConfidence } from './predictionEngine';
import { getEffectivePosition, WR_ARCHETYPES } from '../types';
import {
  engineerDualThreatFeatures,
  engineerBinaryFeatures,
  engineerCBFeatures,
} from './featureEngineering';
import {
  initRandomForest,
  isRandomForestReady,
  predictDualThreat,
  predictBinary,
  predictCB,
  isCBModelReady,
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
 * Always calculates RF score for comparison
 */
export async function predictRecruit(recruit: RecruitInput): Promise<PredictionResult> {
  // Determine effective position (handles ATH by checking archetype)
  const effectivePosition = getEffectivePosition(recruit.position, recruit.archetype);
  const isDualThreat = recruit.archetype === 'Dual Threat';
  const isCB = effectivePosition === 'CB';
  const isWR = effectivePosition === 'WR';

  // Handle CB position
  if (isCB) {
    return predictCBRecruit(recruit);
  }

  // Handle WR position (no model yet - use baseline prediction)
  if (isWR) {
    return predictWRRecruit(recruit);
  }

  // QB prediction flow
  // Step 1: Try rule-based prediction first
  const ruleResult = applyRules(recruit);

  let probability: number;
  let modelUsed: string;
  let rfScore: number | undefined;

  // Always calculate RF score for comparison (if service is ready)
  if (isServiceReady) {
    if (isDualThreat) {
      const features = engineerDualThreatFeatures(recruit);
      rfScore = await predictDualThreat(features);
    } else {
      const features = engineerBinaryFeatures(recruit);
      rfScore = await predictBinary(features);
    }
  }

  if (!ruleResult.useNeuralNetwork) {
    // Rule applied - use rule-based probability
    probability = ruleResult.probability;
    modelUsed = `Rule: ${ruleResult.ruleApplied}`;
  } else {
    // No confident rule - use Random Forest
    if (!isServiceReady || rfScore === undefined) {
      throw new Error('Offline prediction service not initialized');
    }

    probability = rfScore;
    modelUsed = isDualThreat ? 'Dual Threat RF (100 trees)' : 'Binary RF (100 trees)';

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
    rf_score: rfScore,
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

/**
 * Predict CB recruit - handles CB-specific prediction logic
 * Uses rules first (like QB), falls back to RF for uncertain cases
 * Always calculates RF score for comparison
 */
async function predictCBRecruit(recruit: RecruitInput): Promise<PredictionResult> {
  // Step 1: Try rule-based prediction first
  const ruleResult = applyRules(recruit);

  let probability: number;
  let modelUsed: string;
  let rfScore: number | undefined;

  // Always calculate RF score for comparison (if model is ready)
  if (isServiceReady && isCBModelReady()) {
    const features = engineerCBFeatures(recruit);
    rfScore = await predictCB(features);
  }

  if (!ruleResult.useNeuralNetwork) {
    // Rule applied - use rule-based probability
    probability = ruleResult.probability;
    modelUsed = `Rule: ${ruleResult.ruleApplied}`;
  } else {
    // No confident rule - use Random Forest
    if (rfScore !== undefined) {
      probability = rfScore;
      modelUsed = 'CB RF (100 trees)';

      // Apply gem adjustments for CB
      probability = applyGemAdjustmentsCB(probability, recruit.gem_color);
    } else {
      // Fallback to baseline if model not ready
      probability = getBaselinePrediction(recruit);
      modelUsed = 'Baseline (CB model loading)';
    }
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
    rf_score: rfScore,
  };
}

/**
 * Apply gem-based floors/ceilings for CB predictions
 */
function applyGemAdjustmentsCB(
  probability: number,
  gemColor: string | null | undefined
): number {
  if (!gemColor) return probability;

  if (gemColor === 'green') {
    return Math.max(probability, 0.55);
  } else if (gemColor === 'red') {
    return Math.min(probability, 0.25);
  }

  return probability;
}

/**
 * Baseline prediction when no model is available
 * Uses star rating and gem color as simple heuristics
 */
function getBaselinePrediction(recruit: RecruitInput): number {
  const starRating = recruit.star_rating || 3;

  // Base probability from star rating
  let probability = 0.3; // Default for 3-star
  if (starRating === 5) probability = 0.7;
  else if (starRating === 4) probability = 0.5;
  else if (starRating === 2) probability = 0.15;
  else if (starRating === 1) probability = 0.05;

  // Adjust for gems
  if (recruit.gem_color === 'green') {
    probability = Math.max(probability, 0.55);
  } else if (recruit.gem_color === 'red') {
    probability = Math.min(probability, 0.25);
  }

  return probability;
}

/**
 * Predict WR recruit - baseline prediction until we have enough data
 * Uses gem color and star rating as initial heuristics
 */
async function predictWRRecruit(recruit: RecruitInput): Promise<PredictionResult> {
  // For now, use baseline prediction until we have WR training data
  let probability = getBaselinePrediction(recruit);
  let modelUsed = 'WR Baseline (collecting data)';

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
