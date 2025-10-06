-- Clear wants_to_be_maker and maker_approved for ALL users
-- These legacy flags are no longer used - the new system uses user_roles table and team_requests table

UPDATE profiles 
SET 
  wants_to_be_maker = false,
  maker_approved = false
WHERE 
  wants_to_be_maker = true 
  OR maker_approved = true;