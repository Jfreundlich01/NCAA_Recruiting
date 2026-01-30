/**
 * Pure JavaScript Random Forest Predictor
 * Implements decision tree traversal for on-device inference
 */

// Type definitions
interface TreeNode {
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value?: number[]; // [P(class 0), P(class 1)] for leaf nodes
}

interface RandomForestModel {
  n_estimators: number;
  n_features: number;
  feature_names: string[];
  trees: TreeNode[];
}

// Load models from bundled JSON
import dualThreatRF from '../../assets/models/dual_threat/rf_model.json';
import binaryRF from '../../assets/models/binary/rf_model.json';
import cbRF from '../../assets/models/cb/rf_model.json';

// Also load normalization params (for feature names reference)
import dualThreatNorm from '../../assets/models/dual_threat/normalization.json';
import binaryNorm from '../../assets/models/binary/normalization.json';

let isInitialized = false;

/**
 * Initialize the predictor (validates data loaded correctly)
 */
export async function initRandomForest(): Promise<void> {
  if (isInitialized) return;

  // Validate models loaded
  if (!dualThreatRF?.trees || !binaryRF?.trees || !cbRF?.trees) {
    throw new Error('Failed to load Random Forest models');
  }

  console.log(`Random Forest loaded:`);
  console.log(`  Dual Threat: ${dualThreatRF.n_estimators} trees, ${dualThreatRF.n_features} features`);
  console.log(`  Binary: ${binaryRF.n_estimators} trees, ${binaryRF.n_features} features`);
  console.log(`  CB: ${cbRF.n_estimators} trees, ${cbRF.n_features} features`);

  isInitialized = true;
  console.log('Random Forest predictor ready');
}

/**
 * Check if predictor is ready
 */
export function isRandomForestReady(): boolean {
  return isInitialized;
}

/**
 * Get normalization parameters (for compatibility with existing code)
 */
export function getNormalizationParams(modelType: 'dual_threat' | 'binary') {
  return modelType === 'dual_threat' ? dualThreatNorm : binaryNorm;
}

/**
 * Traverse a single decision tree
 * @param node - Current tree node
 * @param features - Feature values array
 * @returns Probability of class 1 (Star/Elite)
 */
function traverseTree(node: TreeNode, features: number[]): number {
  // Leaf node - return probability of Star/Elite (class 1)
  if (node.value !== undefined) {
    return node.value[1]; // P(Star/Elite)
  }

  // Decision node - compare feature to threshold
  const featureValue = features[node.feature!];

  if (featureValue <= node.threshold!) {
    return traverseTree(node.left!, features);
  } else {
    return traverseTree(node.right!, features);
  }
}

/**
 * Predict using Random Forest (average of all trees)
 * @param model - The Random Forest model
 * @param features - Feature values array (NOT normalized - RF doesn't need normalization)
 * @returns Probability of Star/Elite (0-1)
 */
function predictRandomForest(model: RandomForestModel, features: number[]): number {
  const predictions = model.trees.map(tree => traverseTree(tree, features));
  const avgProbability = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
  return avgProbability;
}

/**
 * Predict with Dual Threat Random Forest
 * @param features - Raw feature values (26 features, same order as training)
 * @returns Probability of Star/Elite (0-1)
 */
export async function predictDualThreat(features: number[]): Promise<number> {
  if (!isInitialized) {
    throw new Error('Random Forest not initialized. Call initRandomForest() first.');
  }

  return predictRandomForest(dualThreatRF as RandomForestModel, features);
}

/**
 * Predict with Binary Random Forest
 * @param features - Raw feature values (17 features, same order as training)
 * @returns Probability of Star/Elite (0-1)
 */
export async function predictBinary(features: number[]): Promise<number> {
  if (!isInitialized) {
    throw new Error('Random Forest not initialized. Call initRandomForest() first.');
  }

  return predictRandomForest(binaryRF as RandomForestModel, features);
}

/**
 * Get feature names for a model (useful for debugging)
 */
export function getFeatureNames(modelType: 'dual_threat' | 'binary' | 'cb'): string[] {
  if (modelType === 'cb') {
    return cbRF.feature_names;
  }
  const model = modelType === 'dual_threat' ? dualThreatRF : binaryRF;
  return model.feature_names;
}

/**
 * Check if CB model is ready
 */
export function isCBModelReady(): boolean {
  return isInitialized && !!cbRF?.trees;
}

/**
 * Predict with CB Random Forest
 * @param features - Raw feature values (17 features, same order as training)
 * @returns Probability of Star/Elite (0-1)
 */
export async function predictCB(features: number[]): Promise<number> {
  if (!isInitialized) {
    throw new Error('Random Forest not initialized. Call initRandomForest() first.');
  }

  return predictRandomForest(cbRF as RandomForestModel, features);
}

/**
 * Debug: Print prediction details
 */
export function debugPrediction(
  features: number[],
  modelType: 'dual_threat' | 'binary'
): void {
  const model = (modelType === 'dual_threat' ? dualThreatRF : binaryRF) as RandomForestModel;
  const names = model.feature_names;

  console.log(`\n${modelType.toUpperCase()} RF Prediction Debug:`);
  console.log('Features:');
  features.forEach((val, i) => {
    console.log(`  ${names[i]}: ${val}`);
  });

  const predictions = model.trees.map(tree => traverseTree(tree, features));
  const avg = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;

  console.log(`\nTree predictions (first 10): ${predictions.slice(0, 10).map(p => p.toFixed(2)).join(', ')}`);
  console.log(`Average probability: ${avg.toFixed(3)}`);
}
