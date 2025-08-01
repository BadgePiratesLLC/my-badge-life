-- Add admin role for Kevin Bennett (flightgod@gmail.com)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('009d3daf-82f0-4d8a-9540-0bc89d51d791', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update the profile table role (legacy support)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = '009d3daf-82f0-4d8a-9540-0bc89d51d791';