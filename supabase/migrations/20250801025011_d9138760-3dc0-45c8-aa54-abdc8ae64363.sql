-- Remove the moderator role from Badge Pirates user so they show as Badge Maker
DELETE FROM user_roles 
WHERE user_id = '3502bcbf-f7ff-411c-b67c-a98aafbb3aed' 
AND role = 'moderator';

-- Verify the Badge Pirates user has the correct profile setup
UPDATE profiles 
SET 
  role = 'maker',
  maker_approved = true,
  assigned_team = 'BadgePirates'
WHERE id = '3502bcbf-f7ff-411c-b67c-a98aafbb3aed';