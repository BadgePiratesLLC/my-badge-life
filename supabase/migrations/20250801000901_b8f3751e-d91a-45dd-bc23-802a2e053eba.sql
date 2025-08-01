-- Allow anonymous uploads for testing
CREATE POLICY "Allow anonymous uploads for testing" 
ON public.uploads 
FOR INSERT 
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Allow anonymous uploads viewing for testing" 
ON public.uploads 
FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

-- Drop the old restrictive policies
DROP POLICY "Users can create their own uploads" ON public.uploads;
DROP POLICY "Users can view their own uploads" ON public.uploads;