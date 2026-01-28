-- Add profiles table with dev mode flag
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  is_dev boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (but not is_dev - that's admin only)
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Screenshot batches for bulk processing
create table screenshot_batches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  total_screenshots int default 0,
  processed_screenshots int default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Individual screenshots in a batch
create table screenshots (
  id uuid default gen_random_uuid() primary key,
  batch_id uuid references screenshot_batches(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  extracted_data jsonb,
  recruit_id uuid references recruits(id) on delete set null,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- RLS for screenshot_batches
alter table screenshot_batches enable row level security;

create policy "Users can view own batches"
  on screenshot_batches for select
  using (auth.uid() = user_id);

create policy "Users can insert own batches"
  on screenshot_batches for insert
  with check (auth.uid() = user_id);

create policy "Users can update own batches"
  on screenshot_batches for update
  using (auth.uid() = user_id);

-- RLS for screenshots
alter table screenshots enable row level security;

create policy "Users can view own screenshots"
  on screenshots for select
  using (auth.uid() = user_id);

create policy "Users can insert own screenshots"
  on screenshots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own screenshots"
  on screenshots for update
  using (auth.uid() = user_id);

-- Index for faster batch lookups
create index screenshots_batch_id_idx on screenshots(batch_id);
create index screenshots_status_idx on screenshots(status);

-- Create storage bucket for screenshots (run manually in dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('screenshots', 'screenshots', false);
