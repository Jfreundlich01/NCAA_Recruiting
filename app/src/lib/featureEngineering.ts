/**
 * Feature Engineering Module
 * Transforms raw recruit data into model-ready features
 * Must match exactly with training/train_tfjs_model.py
 */

import { RecruitInput } from './predictionApi';

// QB stat columns in exact order
const QB_STAT_COLUMNS = [
  'awareness',
  'throw_power',
  'short_accuracy',
  'medium_accuracy',
  'deep_accuracy',
  'throw_on_run',
  'under_pressure',
  'break_sack',
  'speed',
  'acceleration',
] as const;

// CB stat columns in exact order
const CB_STAT_COLUMNS = [
  'awareness',
  'speed',
  'acceleration',
  'change_of_direction',
  'agility',
  'man_coverage',
  'zone_coverage',
  'press',
  'catching',
  'tackle',
] as const;

// Normalization parameters loaded from JSON files
interface NormalizationParams {
  mean: number[];
  std: number[];
  features: string[];
}

// These will be loaded from bundled JSON files
let dualThreatNorm: NormalizationParams | null = null;
let binaryNorm: NormalizationParams | null = null;

/**
 * Initialize normalization parameters
 * Called once at app startup
 */
export function initNormalizationParams(
  dualThreat: NormalizationParams,
  binary: NormalizationParams
): void {
  dualThreatNorm = dualThreat;
  binaryNorm = binary;
}

/**
 * Engineer features for Dual Threat model (26 features)
 */
export function engineerDualThreatFeatures(recruit: RecruitInput): number[] {
  const stats = recruit.stats;
  const features: number[] = [];

  // 1. Raw stats (10 features) - in exact order
  features.push(stats.awareness || 0);
  features.push(stats.throw_power || 0);
  features.push(stats.short_accuracy || 0);
  features.push(stats.medium_accuracy || 0);
  features.push(stats.deep_accuracy || 0);
  features.push(stats.throw_on_run || 0);
  features.push(stats.under_pressure || 0);
  features.push(stats.break_sack || 0);
  features.push(stats.speed || 0);
  features.push(stats.acceleration || 0);

  // 2. Star rating (1 feature)
  features.push(recruit.star_rating || 3);

  // 3. Position encoding (1 feature)
  const isQB = recruit.position === 'QB';
  features.push(isQB ? 1 : 0);

  // Get values for threshold features
  const tp = stats.throw_power || 0;
  const spd = stats.speed || 0;
  const sa = stats.short_accuracy || 0;
  const awr = stats.awareness || 0;

  // 4. Threshold features (8 features)
  features.push(tp >= 95 ? 1 : 0); // elite_throw_power
  features.push(tp >= 92 ? 1 : 0); // high_throw_power
  features.push(tp >= 90 ? 1 : 0); // good_throw_power
  features.push(tp >= 88 ? 1 : 0); // med_throw_power
  features.push(spd >= 85 ? 1 : 0); // high_speed
  features.push(spd >= 83 ? 1 : 0); // good_speed
  features.push(sa >= 78 ? 1 : 0); // high_short_acc
  features.push(awr >= 70 ? 1 : 0); // high_awareness

  // 5. Gem encoding (2 features)
  features.push(recruit.gem_color === 'green' ? 1 : 0); // gem_green
  features.push(recruit.gem_color === 'red' ? 1 : 0); // gem_red

  // 6. Combo features (3 features)
  features.push(isQB && spd >= 83 && tp >= 90 ? 1 : 0); // qb_speed_power
  features.push(isQB && spd >= 83 && tp >= 90 && sa >= 78 ? 1 : 0); // qb_triple_combo
  features.push(!isQB && tp >= 88 && spd >= 85 ? 1 : 0); // ath_power_speed

  // 7. High stat count (1 feature)
  const highStatCount =
    (tp >= 90 ? 1 : 0) + (spd >= 82 ? 1 : 0) + (sa >= 80 ? 1 : 0) + (awr >= 70 ? 1 : 0);
  features.push(highStatCount);

  return features;
}

/**
 * Engineer features for Binary model (17 features)
 */
export function engineerBinaryFeatures(recruit: RecruitInput): number[] {
  const stats = recruit.stats;
  const features: number[] = [];

  // 1. Raw stats (10 features) - in exact order
  features.push(stats.awareness || 0);
  features.push(stats.throw_power || 0);
  features.push(stats.short_accuracy || 0);
  features.push(stats.medium_accuracy || 0);
  features.push(stats.deep_accuracy || 0);
  features.push(stats.throw_on_run || 0);
  features.push(stats.under_pressure || 0);
  features.push(stats.break_sack || 0);
  features.push(stats.speed || 0);
  features.push(stats.acceleration || 0);

  // 2. Star rating (1 feature)
  features.push(recruit.star_rating || 3);

  // 3. Gem encoding (2 features)
  features.push(recruit.gem_color === 'green' ? 1 : 0); // gem_green
  features.push(recruit.gem_color === 'red' ? 1 : 0); // gem_red

  // 4. Archetype one-hot encoding (4 features) - exact order from training
  const archetype = (recruit.archetype || '').toLowerCase().replace(' ', '_');
  features.push(archetype === 'pocket_passer' ? 1 : 0); // arch_pocket_passer
  features.push(archetype === 'backfield_creator' ? 1 : 0); // arch_backfield_creator
  features.push(archetype === 'dual_threat' ? 1 : 0); // arch_dual_threat
  features.push(archetype === 'pure_runner' ? 1 : 0); // arch_pure_runner

  return features;
}

/**
 * Engineer features for CB model (31 features)
 * Structure: 10 raw stats + star_rating + 2 gem + 4 archetype + 14 engineered
 */
export function engineerCBFeatures(recruit: RecruitInput): number[] {
  const stats = recruit.stats as Record<string, number>;
  const features: number[] = [];

  // 1. Raw stats (10 features) - in exact order matching CB_STAT_COLUMNS
  const awareness = stats.awareness || 0;
  const speed = stats.speed || 0;
  const acceleration = stats.acceleration || 0;
  const changeOfDirection = stats.change_of_direction || 0;
  const agility = stats.agility || 0;
  const manCoverage = stats.man_coverage || 0;
  const zoneCoverage = stats.zone_coverage || 0;
  const press = stats.press || 0;
  const catching = stats.catching || 0;
  const tackle = stats.tackle || 0;

  features.push(awareness);
  features.push(speed);
  features.push(acceleration);
  features.push(changeOfDirection);
  features.push(agility);
  features.push(manCoverage);
  features.push(zoneCoverage);
  features.push(press);
  features.push(catching);
  features.push(tackle);

  // 2. Star rating (1 feature)
  features.push(recruit.star_rating || 3);

  // 3. Gem encoding (2 features)
  features.push(recruit.gem_color === 'green' ? 1 : 0); // gem_green
  features.push(recruit.gem_color === 'red' ? 1 : 0); // gem_red

  // 4. Archetype one-hot encoding (4 features) - CB archetypes
  const archetype = (recruit.archetype || '').toLowerCase().replace(/ /g, '_');
  features.push(archetype === 'boundary' ? 1 : 0); // arch_boundary
  features.push(archetype === 'bump_and_run' ? 1 : 0); // arch_bump_and_run
  features.push(archetype === 'field' ? 1 : 0); // arch_field
  features.push(archetype === 'zone' ? 1 : 0); // arch_zone

  // 5. Threshold features (6 features) - based on data analysis
  features.push(changeOfDirection >= 92 ? 1 : 0); // elite_cod
  features.push(acceleration >= 94 ? 1 : 0); // elite_acc
  features.push(agility >= 92 ? 1 : 0); // elite_agi
  features.push(speed >= 93 ? 1 : 0); // elite_spd
  features.push(manCoverage >= 78 ? 1 : 0); // high_man
  features.push(speed >= 92 ? 1 : 0); // high_spd

  // 6. Combo features (4 features) - based on data analysis
  features.push(changeOfDirection >= 92 && acceleration >= 94 && agility >= 92 ? 1 : 0); // triple_athletic
  features.push(speed >= 92 && acceleration >= 94 ? 1 : 0); // speed_acc_combo
  features.push(acceleration >= 94 && agility >= 91 ? 1 : 0); // acc_agi_combo
  features.push(changeOfDirection >= 91 && acceleration >= 94 ? 1 : 0); // cod_acc_combo

  // 7. Athletic stat count (1 feature)
  const eliteAthleticCount =
    (changeOfDirection >= 90 ? 1 : 0) +
    (acceleration >= 93 ? 1 : 0) +
    (agility >= 90 ? 1 : 0) +
    (speed >= 91 ? 1 : 0);
  features.push(eliteAthleticCount);

  // 8. Athletic Sum thresholds (2 features) - SPD + ACC + AGI + COD
  const athleticSum = speed + acceleration + agility + changeOfDirection;
  features.push(athleticSum >= 368 ? 1 : 0); // high_athletic_sum
  features.push(athleticSum >= 366 ? 1 : 0); // good_athletic_sum

  // 9. Archetype + Speed interaction feature (1 feature) - slow CBs in speed-dependent roles
  // Note: archetype already defined above at line 194
  features.push(archetype === 'field' && speed < 87 ? 1 : 0); // field_slow
  // Note: boundary_slow removed - only n=6 samples

  return features;
}

/**
 * Normalize features using pre-computed mean/std
 */
export function normalizeFeatures(
  features: number[],
  modelType: 'dual_threat' | 'binary'
): number[] {
  const norm = modelType === 'dual_threat' ? dualThreatNorm : binaryNorm;

  if (!norm) {
    throw new Error(`Normalization params not loaded for ${modelType}`);
  }

  if (features.length !== norm.mean.length) {
    throw new Error(
      `Feature count mismatch: got ${features.length}, expected ${norm.mean.length}`
    );
  }

  return features.map((val, i) => {
    const std = norm.std[i];
    // Avoid division by zero (same as Python: X_std[X_std == 0] = 1)
    return (val - norm.mean[i]) / (std === 0 ? 1 : std);
  });
}

/**
 * Get the feature names for debugging
 */
export function getFeatureNames(modelType: 'dual_threat' | 'binary'): string[] {
  const norm = modelType === 'dual_threat' ? dualThreatNorm : binaryNorm;
  return norm?.features || [];
}

/**
 * Debug helper: Print features with their names and values
 */
export function debugFeatures(
  features: number[],
  modelType: 'dual_threat' | 'binary'
): void {
  const names = getFeatureNames(modelType);
  console.log(`\n${modelType.toUpperCase()} Features:`);
  features.forEach((val, i) => {
    console.log(`  ${names[i] || `feature_${i}`}: ${val}`);
  });
}
