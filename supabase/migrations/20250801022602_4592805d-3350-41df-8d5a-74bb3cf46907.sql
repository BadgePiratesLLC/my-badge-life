-- Update the badgepirateslabs user's profile to reflect their moderator status
UPDATE profiles 
SET 
  role = 'maker',
  maker_approved = true,
  assigned_team = 'BadgePirates'
WHERE email = 'badgepirateslabs@gmail.com';