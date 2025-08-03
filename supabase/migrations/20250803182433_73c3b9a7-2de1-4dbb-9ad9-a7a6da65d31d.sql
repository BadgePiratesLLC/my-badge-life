-- Add metadata columns to uploads table to store badge information from analysis
ALTER TABLE public.uploads 
ADD COLUMN badge_name text,
ADD COLUMN badge_description text,
ADD COLUMN badge_year integer,
ADD COLUMN badge_maker text,
ADD COLUMN badge_category text,
ADD COLUMN badge_external_link text,
ADD COLUMN analysis_metadata jsonb;

-- Add comment explaining the new columns
COMMENT ON COLUMN public.uploads.badge_name IS 'Badge name from AI analysis or user input';
COMMENT ON COLUMN public.uploads.badge_description IS 'Badge description from AI analysis or user input';
COMMENT ON COLUMN public.uploads.badge_year IS 'Badge year from AI analysis or user input';
COMMENT ON COLUMN public.uploads.badge_maker IS 'Badge maker from AI analysis or user input';
COMMENT ON COLUMN public.uploads.badge_category IS 'Badge category from AI analysis or user input';
COMMENT ON COLUMN public.uploads.badge_external_link IS 'External link from AI analysis or user input';
COMMENT ON COLUMN public.uploads.analysis_metadata IS 'Full AI analysis results as JSON for reference';