-- Add RLS policy to allow admins to delete badges
CREATE POLICY "Admins can delete badges" 
ON public.badges 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));