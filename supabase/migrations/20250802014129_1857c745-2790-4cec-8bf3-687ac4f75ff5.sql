-- Add website_url field to teams table
ALTER TABLE public.teams 
ADD COLUMN website_url TEXT;