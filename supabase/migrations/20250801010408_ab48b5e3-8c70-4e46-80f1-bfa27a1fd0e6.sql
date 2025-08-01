-- Allow admins to create badges too
CREATE POLICY "Admins can create badges" 
ON public.badges 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));