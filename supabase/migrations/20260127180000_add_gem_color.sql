-- Add gem_color field to track green/red gem indicator on recruits
ALTER TABLE recruits
ADD COLUMN IF NOT EXISTS gem_color TEXT CHECK (gem_color IN ('green', 'red') OR gem_color IS NULL);

COMMENT ON COLUMN recruits.gem_color IS 'Green or red gem indicator visible on recruit profile (green = positive, red = negative)';
