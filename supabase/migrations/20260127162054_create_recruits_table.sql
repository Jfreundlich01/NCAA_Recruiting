-- NCAA Recruiting Dev Trait Predictor - Supabase Schema

-- Recruits table
create table recruits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Game context
  game_version text not null check (game_version in ('ncaa_25', 'ncaa_26', 'ncaa_27')),
  game_year int not null,

  -- Basic Info
  name text not null,
  position text not null,
  archetype text not null,
  star_rating int not null check (star_rating >= 1 and star_rating <= 5),

  -- Physical
  height_feet int not null,
  height_inches int not null check (height_inches >= 0 and height_inches <= 11),
  weight_lbs int not null,

  -- Location
  hometown text,
  state text,

  -- The 10 scoutable stats (flat JSONB object)
  -- Example: {"awareness": 85, "throw_power": 92, "short_accuracy": 88, ...}
  stats jsonb not null default '{}'::jsonb,

  -- Screenshot (premium)
  screenshot_url text,

  -- Ground Truth (filled in after signing)
  actual_dev_trait text check (actual_dev_trait in ('normal', 'impact', 'star', 'elite')),
  dev_trait_reported_at timestamptz,

  -- Prediction (what the model predicted)
  predicted_dev_trait text check (predicted_dev_trait in ('normal', 'impact', 'star', 'elite')),
  prediction_confidence jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index recruits_user_id_idx on recruits(user_id);
create index recruits_position_idx on recruits(position);
create index recruits_game_version_idx on recruits(game_version);

-- Enable Row Level Security
alter table recruits enable row level security;

-- RLS Policies
create policy "Users can view own recruits"
  on recruits for select
  using (auth.uid() = user_id);

create policy "Users can insert own recruits"
  on recruits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recruits"
  on recruits for update
  using (auth.uid() = user_id);

create policy "Users can delete own recruits"
  on recruits for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_recruits_updated_at
  before update on recruits
  for each row
  execute function update_updated_at_column();

-- View for ML training data export (anonymized)
create view recruit_training_data as
select
  id,
  game_version,
  position,
  archetype,
  star_rating,
  height_feet,
  height_inches,
  weight_lbs,
  state,
  stats,
  actual_dev_trait
from recruits
where actual_dev_trait is not null;
