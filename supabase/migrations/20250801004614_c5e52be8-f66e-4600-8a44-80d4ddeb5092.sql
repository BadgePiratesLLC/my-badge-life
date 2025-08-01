-- Add admin policies for uploads table to allow admins to delete any upload
CREATE POLICY "Admins can delete any upload" 
ON public.uploads 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all uploads" 
ON public.uploads 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));