-- Sync assigned_team field for all users who are in team_members but have null assigned_team
UPDATE profiles 
SET assigned_team = (
  SELECT t.name 
  FROM team_members tm 
  JOIN teams t ON tm.team_id = t.id 
  WHERE tm.user_id = profiles.id 
  LIMIT 1
)
WHERE id IN (
  SELECT user_id FROM team_members WHERE user_id NOT IN (
    SELECT id FROM profiles WHERE assigned_team IS NOT NULL
  )
);