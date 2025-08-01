-- Clean up role inconsistencies and create a more consistent role system
-- First, let's see what roles Badge Pirates currently has
-- Then remove the 'moderator' role from user_roles and ensure they have proper access

-- Remove the moderator role from Badge Pirates and ensure they're properly set as a maker
DELETE FROM user_roles 
WHERE user_id = '3502bcbf-f7ff-411c-b67c-a98aafbb3aed' 
AND role = 'moderator';

-- Update the profile to ensure Badge Pirates is properly configured as an approved maker
UPDATE profiles 
SET 
  role = 'maker',
  maker_approved = true,
  assigned_team = 'BadgePirates'
WHERE id = '3502bcbf-f7ff-411c-b67c-a98aafbb3aed';