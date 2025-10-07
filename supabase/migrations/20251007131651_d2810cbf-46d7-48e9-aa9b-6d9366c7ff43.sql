-- Fix badge_confirmations RLS policy to prevent public user tracking
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Users can view all confirmations" ON public.badge_confirmations;

-- Create restricted policies: users can only see their own confirmations, admins can see all
CREATE POLICY "Users can view their own confirmations"
ON public.badge_confirmations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  user_id IS NULL
);

CREATE POLICY "Admins can view all confirmations"
ON public.badge_confirmations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);