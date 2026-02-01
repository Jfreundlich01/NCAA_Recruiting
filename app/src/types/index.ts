// Dev trait options
export type DevTrait = 'normal' | 'impact' | 'star' | 'elite';

// Game versions
export type GameVersion = 'ncaa_25' | 'ncaa_26' | 'ncaa_27';

// Positions - starting with QB only for validation
export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'S' | 'K' | 'P';

// QB Archetypes (correct values for NCAA game)
export type QBArchetype = 'Pocket Passer' | 'Dual Threat' | 'Backfield Creator';

// CB Archetypes
export type CBArchetype = 'Boundary' | 'Bump and Run' | 'Field' | 'Zone';

// WR Archetypes
export type WRArchetype = 'Speedster' | 'Route Artist' | 'Contested Specialist' | 'Physical Route Runner' | 'Elusive Route Runner' | 'Gritty Possession' | 'Gadget';

// Positions for QB/ATH recruiting
export type QBPosition = 'QB' | 'ATH';

// Positions for WR/ATH recruiting
export type WRPosition = 'WR' | 'ATH';

// Recruit class year
export type RecruitClass = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';

// User tier
export type UserTier = 'free' | 'premium';

// User profile
export interface User {
  id: string;
  email: string;
  created_at: string;
  current_game_year: number;
  tier: UserTier;
}


// QB stats as flat object keys (for JSONB storage)
export interface QBStats {
  awareness: number;
  throw_power: number;
  short_accuracy: number;
  medium_accuracy: number;
  deep_accuracy: number;
  throw_on_run: number;
  under_pressure: number;
  break_sack: number;
  speed: number;
  acceleration: number;
}

// CB stats as flat object keys (for JSONB storage)
export interface CBStats {
  awareness: number;
  speed: number;
  acceleration: number;
  change_of_direction: number;
  agility: number;
  man_coverage: number;
  zone_coverage: number;
  press: number;
  catching: number;
  tackle: number;
}

// WR stats as flat object keys (for JSONB storage)
export interface WRStats {
  awareness: number;
  speed: number;
  acceleration: number;
  catching: number;
  catch_in_traffic: number;
  spectacular_catch: number;
  short_route: number;
  medium_route: number;
  deep_route: number;
  agility: number;
}

// Union type for all position stats
export type PositionStats = QBStats | CBStats | WRStats;

// Main recruit type
export interface Recruit {
  id: string;
  user_id: string;
  game_version: GameVersion;
  game_year: number;

  // Basic Info
  name: string;
  position: Position;
  archetype: string;
  star_rating: number; // 1-5

  // Physical - stored separately for easier querying
  height_feet: number;
  height_inches: number; // the remaining inches (0-11)
  weight_lbs: number;

  // Location
  hometown: string;
  state: string;

  // The 10 scoutable stats (flat JSONB object)
  stats: PositionStats;

  // New fields from enhanced OCR
  class?: string; // Freshman, Sophomore, Junior, Senior
  abilities?: string[]; // Array of ability names
  mentals?: string[]; // Array of mental trait names
  ocr_dev_trait?: string; // Dev trait extracted from screenshot (before recruiting)
  gem_color?: 'green' | 'red' | null; // Green or red gem indicator on recruit profile

  // Screenshot (premium)
  screenshot_url?: string;

  // Ground Truth (filled in later by user after recruiting)
  actual_dev_trait?: DevTrait;
  dev_trait_reported_at?: string;

  // Prediction
  predicted_dev_trait?: DevTrait;
  prediction_confidence?: {
    normal: number;
    impact: number;
    star: number;
    elite: number;
  };

  created_at: string;
  updated_at: string;
}

// For creating a new recruit
export interface CreateRecruitInput {
  game_version: GameVersion;
  game_year: number;
  name: string;
  position: Position;
  archetype: string;
  star_rating: number;
  height_feet: number;
  height_inches: number;
  weight_lbs: number;
  hometown: string;
  state: string;
  stats: PositionStats;
  screenshot_url?: string;
}

// QB stat definitions - display names and keys
export const QB_STAT_CONFIG = [
  { key: 'awareness', label: 'Awareness' },
  { key: 'throw_power', label: 'Throw Power' },
  { key: 'short_accuracy', label: 'Short Accuracy' },
  { key: 'medium_accuracy', label: 'Medium Accuracy' },
  { key: 'deep_accuracy', label: 'Deep Accuracy' },
  { key: 'throw_on_run', label: 'Throw on Run' },
  { key: 'under_pressure', label: 'Under Pressure' },
  { key: 'break_sack', label: 'Break Sack' },
  { key: 'speed', label: 'Speed' },
  { key: 'acceleration', label: 'Acceleration' },
] as const;

export type QBStatKey = typeof QB_STAT_CONFIG[number]['key'];

// CB stat definitions - display names and keys
export const CB_STAT_CONFIG = [
  { key: 'awareness', label: 'Awareness' },
  { key: 'speed', label: 'Speed' },
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'change_of_direction', label: 'Change of Direction' },
  { key: 'agility', label: 'Agility' },
  { key: 'man_coverage', label: 'Man Coverage' },
  { key: 'zone_coverage', label: 'Zone Coverage' },
  { key: 'press', label: 'Press' },
  { key: 'catching', label: 'Catching' },
  { key: 'tackle', label: 'Tackle' },
] as const;

export type CBStatKey = typeof CB_STAT_CONFIG[number]['key'];

// WR stat definitions - display names and keys
export const WR_STAT_CONFIG = [
  { key: 'awareness', label: 'Awareness' },
  { key: 'speed', label: 'Speed' },
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'catching', label: 'Catching' },
  { key: 'catch_in_traffic', label: 'Catch in Traffic' },
  { key: 'spectacular_catch', label: 'Spectacular Catch' },
  { key: 'short_route', label: 'Short Route' },
  { key: 'medium_route', label: 'Medium Route' },
  { key: 'deep_route', label: 'Deep Route' },
  { key: 'agility', label: 'Agility' },
] as const;

export type WRStatKey = typeof WR_STAT_CONFIG[number]['key'];

// Helper to get stat config by position
export function getStatConfigForPosition(position: Position | 'ATH') {
  switch (position) {
    case 'CB':
      return CB_STAT_CONFIG;
    case 'WR':
      return WR_STAT_CONFIG;
    case 'QB':
    default:
      return QB_STAT_CONFIG;
  }
}

// Helper to get archetypes by position
export function getArchetypesForPosition(position: Position | 'ATH'): string[] {
  switch (position) {
    case 'CB':
      return ['Boundary', 'Bump and Run', 'Field', 'Zone'];
    case 'WR':
      return ['Speedster', 'Route Artist', 'Contested Specialist', 'Physical Route Runner', 'Elusive Route Runner', 'Gritty Possession', 'Gadget'];
    case 'QB':
    default:
      return ['Pocket Passer', 'Dual Threat', 'Backfield Creator'];
  }
}

// QB archetypes (for ATH detection)
export const QB_ARCHETYPES = ['Pocket Passer', 'Dual Threat', 'Backfield Creator'];

// WR archetypes (for ATH detection)
export const WR_ARCHETYPES = ['Speedster', 'Route Artist', 'Contested Specialist', 'Physical Route Runner', 'Elusive Route Runner', 'Gritty Possession', 'Gadget'];

// CB archetypes
export const CB_ARCHETYPES = ['Boundary', 'Bump and Run', 'Field', 'Zone'];

// Helper to determine effective position (handles ATH)
export function getEffectivePosition(position: string, archetype: string): 'QB' | 'WR' | 'CB' | string {
  // If position is explicit, use it
  if (position === 'QB') return 'QB';
  if (position === 'WR') return 'WR';
  if (position === 'CB') return 'CB';

  // For ATH, determine by archetype
  if (position === 'ATH') {
    if (QB_ARCHETYPES.includes(archetype)) return 'QB';
    if (WR_ARCHETYPES.includes(archetype)) return 'WR';
    if (CB_ARCHETYPES.includes(archetype)) return 'CB';
  }

  return position; // fallback
}

// US States for dropdown
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];
