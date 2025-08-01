-- Fix the DEF CON 30 image URL
UPDATE public.badges 
SET image_url = 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop&crop=center'
WHERE name = 'DEF CON 30';