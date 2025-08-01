-- Add team and category fields to badges table
ALTER TABLE public.badges 
ADD COLUMN team_name text,
ADD COLUMN category text CHECK (category IN ('Elect Badge', 'None Elect Badge', 'SAO', 'Tool', 'Misc'));

-- Add team assignment to profiles table
ALTER TABLE public.profiles 
ADD COLUMN assigned_team text;

-- Create enum for badge categories
CREATE TYPE public.badge_category AS ENUM ('Elect Badge', 'None Elect Badge', 'SAO', 'Tool', 'Misc');

-- Update badges table to use the enum
ALTER TABLE public.badges 
DROP CONSTRAINT IF EXISTS badges_category_check,
ALTER COLUMN category TYPE badge_category USING category::badge_category;

-- Update RLS policies for team-based badge management
DROP POLICY IF EXISTS "Makers can update their own badges" ON public.badges;

-- New policy: Makers can update badges assigned to their team
CREATE POLICY "Makers can update team badges" 
ON public.badges 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      (profiles.role = 'admin') OR 
      (profiles.role = 'maker' AND profiles.maker_approved = true AND profiles.assigned_team = badges.team_name)
    )
  )
);

-- Policy: Only admins can update team_name field
CREATE POLICY "Only admins can update team assignments" 
ON public.badges 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));