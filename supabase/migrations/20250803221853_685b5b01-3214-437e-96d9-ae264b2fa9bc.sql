-- Create a view for public badge statistics that bypasses RLS for counting
CREATE OR REPLACE VIEW public.badge_stats AS
SELECT 
  badge_id,
  SUM(CASE WHEN status = 'own' THEN 1 ELSE 0 END) as owners_count,
  SUM(CASE WHEN status = 'want' THEN 1 ELSE 0 END) as wants_count
FROM public.ownership
GROUP BY badge_id;

-- Grant select access to the view
GRANT SELECT ON public.badge_stats TO authenticated, anon;

-- Create RLS policy for the view (allow everyone to see public stats)
ALTER VIEW public.badge_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badge stats are viewable by everyone" 
ON public.badge_stats 
FOR SELECT 
USING (true);