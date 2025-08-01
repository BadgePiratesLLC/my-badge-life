-- Replace placeholder images with working URLs
UPDATE public.badges 
SET image_url = CASE 
  WHEN name = 'DEF CON 30' THEN 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=200&fit=crop&crop=center'
  WHEN name = 'BSides Vegas 2023' THEN 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop&crop=center'
  WHEN name = 'Black Hat 2022' THEN 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?w=300&h=200&fit=crop&crop=center'
  WHEN name = 'ShmooCon 2023' THEN 'https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=300&h=200&fit=crop&crop=center'
  WHEN name = 'DerbyCon Legacy' THEN 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop&crop=center'
  ELSE image_url
END
WHERE name IN ('DEF CON 30', 'BSides Vegas 2023', 'Black Hat 2022', 'ShmooCon 2023', 'DerbyCon Legacy');