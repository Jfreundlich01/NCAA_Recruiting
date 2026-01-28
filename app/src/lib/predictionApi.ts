/**
 * Prediction API client
 * Calls the FastAPI backend to get model predictions
 */

// API URL - update this when deployed
const API_URL = process.env.EXPO_PUBLIC_PREDICTION_API_URL || 'http://localhost:8000';

export interface RecruitStats {
  awareness?: number;
  throw_power?: number;
  short_accuracy?: number;
  medium_accuracy?: number;
  deep_accuracy?: number;
  throw_on_run?: number;
  under_pressure?: number;
  break_sack?: number;
  speed?: number;
  acceleration?: number;
}

export interface RecruitInput {
  name: string;
  position: string;
  archetype: string;
  star_rating?: number;
  gem_color?: string | null;
  stats: RecruitStats;
}

export interface PredictionResult {
  name: string;
  position: string;
  archetype: string;
  star_elite_probability: number;
  star_elite_percentage: number;
  recommendation: string;
  confidence: string;
  ml_model: string;
}

export interface BatchPredictionResponse {
  predictions: PredictionResult[];
}

/**
 * Predict Star/Elite probability for a single recruit
 */
export async function predictRecruit(recruit: RecruitInput): Promise<PredictionResult> {
  const response = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recruit),
  });

  if (!response.ok) {
    throw new Error(`Prediction API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Predict Star/Elite probability for multiple recruits (batch)
 * Returns predictions sorted by probability (highest first)
 */
export async function predictRecruitsBatch(recruits: RecruitInput[]): Promise<PredictionResult[]> {
  const response = await fetch(`${API_URL}/predict/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recruits }),
  });

  if (!response.ok) {
    throw new Error(`Prediction API error: ${response.status}`);
  }

  const data: BatchPredictionResponse = await response.json();
  return data.predictions;
}

/**
 * Check if the prediction API is healthy
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}
