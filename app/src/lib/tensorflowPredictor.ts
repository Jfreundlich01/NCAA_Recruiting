/**
 * Pure JavaScript Neural Network Predictor
 * No external dependencies - runs anywhere
 */

// Type definitions
interface ModelWeights {
  weights: Record<string, number[] | number[][]>;
  normalization: {
    mean: number[];
    std: number[];
    features: string[];
  };
}

// Load weights from bundled JSON
import dualThreatWeights from '../../assets/models/dual_threat/model_weights.json';
import binaryWeights from '../../assets/models/binary/model_weights.json';

let isInitialized = false;

/**
 * Initialize the predictor (lightweight - just validates data)
 */
export async function initTensorFlow(): Promise<void> {
  if (isInitialized) return;

  // Validate weights loaded correctly
  if (!dualThreatWeights?.weights || !binaryWeights?.weights) {
    throw new Error('Failed to load model weights');
  }

  isInitialized = true;
  console.log('Pure JS Neural Network ready');
}

/**
 * Check if predictor is ready
 */
export function isTensorFlowReady(): boolean {
  return isInitialized;
}

/**
 * Get normalization parameters
 */
export function getNormalizationParams(modelType: 'dual_threat' | 'binary') {
  const weights = modelType === 'dual_threat' ? dualThreatWeights : binaryWeights;
  return weights.normalization;
}

// ============ Neural Network Math ============

/**
 * ReLU activation function
 */
function relu(x: number): number {
  return Math.max(0, x);
}

/**
 * Sigmoid activation function
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Dense layer forward pass
 */
function denseLayer(
  input: number[],
  kernel: number[][],
  bias: number[],
  activation: 'relu' | 'sigmoid' | 'linear'
): number[] {
  const output: number[] = [];

  // kernel shape: [input_dim, output_dim]
  const outputDim = kernel[0].length;

  for (let j = 0; j < outputDim; j++) {
    let sum = bias[j];
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * kernel[i][j];
    }

    // Apply activation
    if (activation === 'relu') {
      output.push(relu(sum));
    } else if (activation === 'sigmoid') {
      output.push(sigmoid(sum));
    } else {
      output.push(sum);
    }
  }

  return output;
}

// ============ Model Forward Passes ============

/**
 * Dual Threat model forward pass
 * Architecture: Input(26) -> Dense(32,relu) -> Dense(16,relu) -> Dense(1,sigmoid)
 */
export async function predictDualThreat(normalizedFeatures: number[]): Promise<number> {
  const w = dualThreatWeights.weights;

  // Layer 1: Dense(32, relu)
  let x = denseLayer(
    normalizedFeatures,
    w['sequential/dense/kernel'] as number[][],
    w['sequential/dense/bias'] as number[],
    'relu'
  );

  // Layer 2: Dense(16, relu)
  x = denseLayer(
    x,
    w['sequential/dense_1/kernel'] as number[][],
    w['sequential/dense_1/bias'] as number[],
    'relu'
  );

  // Layer 3: Dense(1, sigmoid)
  x = denseLayer(
    x,
    w['sequential/dense_2/kernel'] as number[][],
    w['sequential/dense_2/bias'] as number[],
    'sigmoid'
  );

  return x[0];
}

/**
 * Binary model forward pass
 * Architecture: Input(17) -> Dense(24,relu) -> Dense(12,relu) -> Dense(1,sigmoid)
 */
export async function predictBinary(normalizedFeatures: number[]): Promise<number> {
  const w = binaryWeights.weights;

  // Layer 1: Dense(24, relu)
  let x = denseLayer(
    normalizedFeatures,
    w['sequential_1/dense_3/kernel'] as number[][],
    w['sequential_1/dense_3/bias'] as number[],
    'relu'
  );

  // Layer 2: Dense(12, relu)
  x = denseLayer(
    x,
    w['sequential_1/dense_4/kernel'] as number[][],
    w['sequential_1/dense_4/bias'] as number[],
    'relu'
  );

  // Layer 3: Dense(1, sigmoid)
  x = denseLayer(
    x,
    w['sequential_1/dense_5/kernel'] as number[][],
    w['sequential_1/dense_5/bias'] as number[],
    'sigmoid'
  );

  return x[0];
}
