-- Harden function by setting fixed search_path and security definer
CREATE OR REPLACE FUNCTION public.ensure_single_primary_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  -- If setting an image as primary, unset all other primary images for this badge
  IF NEW.is_primary = true THEN
    UPDATE public.badge_images 
    SET is_primary = false 
    WHERE badge_id = NEW.badge_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  
  -- If no primary image exists for this badge, make this one primary
  IF NOT EXISTS (
    SELECT 1 FROM public.badge_images 
    WHERE badge_id = NEW.badge_id 
      AND is_primary = true 
      AND id != NEW.id
  ) THEN
    NEW.is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$function$;