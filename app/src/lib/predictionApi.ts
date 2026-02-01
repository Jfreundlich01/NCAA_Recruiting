/**
 * Prediction API client
 * Calls the FastAPI backend to get model predictions
 */

// API URL - update this when deployed
const API_URL = process.env.EXPO_PUBLIC_PREDICTION_API_URL || 'http://localhost:8000';

export interface RecruitStats {
  // Shared stats
  awareness?: number;
  speed?: number;
  acceleration?: number;
  // QB stats
  throw_power?: number;
  short_accuracy?: number;
  medium_accuracy?: number;
  deep_accuracy?: number;
  throw_on_run?: number;
  under_pressure?: number;
  break_sack?: number;
  // CB stats
  agility?: number;
  change_of_direction?: number;
  man_coverage?: number;
  zone_coverage?: number;
  press?: number;
  tackle?: number;
  catching?: number;
  // WR stats
  catch_in_traffic?: number;
  spectacular_catch?: number;
  short_route?: number;
  medium_route?: number;
  deep_route?: number;
}

export interface RecruitInput {
  name: string;
  position: string;
  archetype: string;
  star_rating?: number;
  gem_color?: string | null;
  stats: RecruitStats;
  abilities?: string[];
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
  rf_score?: number; // Raw RF model score (for comparison when rules applied)
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
