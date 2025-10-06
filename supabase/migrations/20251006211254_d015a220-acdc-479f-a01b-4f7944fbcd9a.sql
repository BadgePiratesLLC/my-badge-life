-- Reset old maker request flags so users can use the new team request system
-- This clears wants_to_be_maker and maker_approved for users who aren't already assigned to teams
-- and don't have active moderator roles

UPDATE profiles 
SET 
  wants_to_be_maker = false,
  maker_approved = false
WHERE 
  wants_to_be_maker = true 
  AND assigned_team IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'moderator'
  );