-- Update the function to use a safer search path
CREATE OR REPLACE FUNCTION public.get_badge_stats(badge_uuid uuid)
RETURNS TABLE(owners_count bigint, wants_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    SUM(CASE WHEN status = 'own' THEN 1 ELSE 0 END) as owners_count,
    SUM(CASE WHEN status = 'want' THEN 1 ELSE 0 END) as wants_count
  FROM public.ownership
  WHERE badge_id = badge_uuid;
$$;