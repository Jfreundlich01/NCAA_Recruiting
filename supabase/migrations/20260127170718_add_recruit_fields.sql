-- Add new fields for enhanced OCR extraction
-- class: freshman, sophomore, junior, senior
-- abilities: array of ability names
-- mentals: array of mental trait names
-- development_trait: Normal, Impact, Star, Elite (from OCR, different from actual_dev_trait which is user-reported)

ALTER TABLE recruits
ADD COLUMN IF NOT EXISTS class TEXT,
ADD COLUMN IF NOT EXISTS abilities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mentals TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ocr_dev_trait TEXT;

-- Add comment to clarify the difference between ocr_dev_trait and actual_dev_trait
COMMENT ON COLUMN recruits.ocr_dev_trait IS 'Development trait extracted from screenshot via OCR (before recruiting)';
COMMENT ON COLUMN recruits.actual_dev_trait IS 'Actual development trait reported by user after recruiting the player';
