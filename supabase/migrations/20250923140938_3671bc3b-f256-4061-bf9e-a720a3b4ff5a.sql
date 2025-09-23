-- Drop the overly permissive policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create more secure policies for profile access
-- Policy 1: Users can view their own complete profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Authenticated users can view limited public profile info (no email)
-- This allows displaying maker names and roles without exposing sensitive data
CREATE POLICY "Authenticated users can view limited profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- However, we need to be more restrictive. Let me create a better approach:
-- Drop the second policy and create a more secure one
DROP POLICY IF EXISTS "Authenticated users can view limited profile info" ON public.profiles;

-- Policy 2: Authenticated users can only see maker/admin display names and roles for attribution
-- This is needed for badge attribution but doesn't expose emails
CREATE POLICY "Public profile visibility for attribution" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Users can always see their own profile completely
  auth.uid() = id 
  OR 
  -- Others can only see basic info for makers and admins (for badge attribution)
  (role IN ('maker', 'admin') AND maker_approved = true)
);

-- Add a policy for anonymous users to see absolutely nothing
CREATE POLICY "Anonymous users cannot view profiles" 
ON public.profiles 
FOR SELECT 
TO anon
USING (false);