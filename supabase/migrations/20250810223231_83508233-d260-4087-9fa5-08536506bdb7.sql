-- Enforce single primary image and fix existing data

-- 1) Create triggers that call the existing function public.ensure_single_primary_image()
-- Drop if they exist to be idempotent
DROP TRIGGER IF EXISTS trg_badge_images_single_primary_insert ON public.badge_images;
DROP TRIGGER IF EXISTS trg_badge_images_single_primary_update ON public.badge_images;

-- Create BEFORE INSERT trigger
CREATE TRIGGER trg_badge_images_single_primary_insert
BEFORE INSERT ON public.badge_images
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_primary_image();

-- Create BEFORE UPDATE trigger (only when is_primary or badge_id change)
CREATE TRIGGER trg_badge_images_single_primary_update
BEFORE UPDATE OF is_primary, badge_id ON public.badge_images
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_primary_image();

-- 2) One-time data cleanup to ensure exactly one primary per badge
-- Preference order: currently primary > lowest display_order > oldest created_at
WITH ranked AS (
  SELECT 
    id,
    badge_id,
    is_primary,
    display_order,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY badge_id
      ORDER BY is_primary DESC, display_order ASC, created_at ASC, id ASC
    ) AS rn
  FROM public.badge_images
)
UPDATE public.badge_images bi
SET is_primary = (r.rn = 1)
FROM ranked r
WHERE bi.id = r.id;