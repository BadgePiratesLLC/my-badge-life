-- Drop the overly permissive policy that exposes all user search history
DROP POLICY IF EXISTS "Users can view all feedback for transparency" ON public.ai_search_feedback;

-- Create secure policies for feedback access

-- Policy 1: Users can only view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON public.ai_search_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Admins can view all feedback for moderation
CREATE POLICY "Admins can view all feedback" 
ON public.ai_search_feedback 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));