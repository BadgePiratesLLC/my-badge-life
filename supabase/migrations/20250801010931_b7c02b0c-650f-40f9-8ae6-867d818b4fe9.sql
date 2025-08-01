-- Update badge images with better tech/security themed images
UPDATE public.badges 
SET image_url = CASE 
  WHEN name = 'Black Hat 2022' THEN 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop&crop=center'
  WHEN name = 'DEF CON 30' THEN 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop&crop=center'
  WHEN name = 'ShmooCon 2023' THEN 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=300&fit=crop&crop=center'
  WHEN name = 'DerbyCon Legacy' THEN 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop&crop=center'
  WHEN name = 'BSides Vegas 2023' THEN 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=400&h=300&fit=crop&crop=center'
  ELSE image_url
END
WHERE name IN ('Black Hat 2022', 'DEF CON 30', 'ShmooCon 2023', 'DerbyCon Legacy', 'BSides Vegas 2023');