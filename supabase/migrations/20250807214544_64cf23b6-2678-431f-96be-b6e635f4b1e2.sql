-- Fix badges with multiple primary images by keeping only the most recent one
UPDATE badge_images 
SET is_primary = false 
WHERE id NOT IN (
  SELECT DISTINCT ON (badge_id) id 
  FROM badge_images 
  WHERE is_primary = true 
  ORDER BY badge_id, created_at DESC
) 
AND is_primary = true;

-- Ensure every badge has exactly one primary image
UPDATE badge_images 
SET is_primary = true 
WHERE id IN (
  SELECT DISTINCT ON (badge_id) id 
  FROM badge_images 
  WHERE badge_id NOT IN (
    SELECT badge_id 
    FROM badge_images 
    WHERE is_primary = true
  )
  ORDER BY badge_id, created_at ASC
);

-- Recreate the trigger to ensure it works properly
DROP TRIGGER IF EXISTS ensure_single_primary_image_trigger ON public.badge_images;

CREATE TRIGGER ensure_single_primary_image_trigger
  BEFORE INSERT OR UPDATE ON public.badge_images
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_primary_image();