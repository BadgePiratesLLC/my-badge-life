-- Add is_primary flag to team_members
ALTER TABLE public.team_members 
ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;

-- Create unique constraint: user can only have one primary team
CREATE UNIQUE INDEX team_members_user_primary_unique 
ON public.team_members (user_id) 
WHERE is_primary = true;

-- Migrate existing data: set primary team based on assigned_team in profiles
DO $$
DECLARE
  profile_record RECORD;
  team_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, assigned_team 
    FROM public.profiles 
    WHERE assigned_team IS NOT NULL
  LOOP
    -- Find the team by name
    SELECT id INTO team_record
    FROM public.teams
    WHERE name = profile_record.assigned_team
    LIMIT 1;
    
    IF FOUND THEN
      -- Update existing team_member to be primary
      UPDATE public.team_members
      SET is_primary = true
      WHERE user_id = profile_record.id 
        AND team_id = team_record.id;
      
      -- If no team_member exists, create one
      IF NOT FOUND THEN
        INSERT INTO public.team_members (user_id, team_id, is_primary)
        VALUES (profile_record.id, team_record.id, true)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Add comment explaining the migration
COMMENT ON COLUMN public.team_members.is_primary IS 'Indicates the users primary team. Only one team per user can be primary.';

-- Add index for faster primary team lookups
CREATE INDEX idx_team_members_primary ON public.team_members (user_id, is_primary) WHERE is_primary = true;