-- Drop all existing SELECT policies on profiles to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profile visibility for attribution" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous users cannot view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create clean, consolidated policies

-- Policy 1: Users can view their own complete profile (including email)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Admins can view all profiles for management purposes
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create a security definer function for public maker attribution
-- This function only returns non-sensitive data (display_name, role) for makers/admins
CREATE OR REPLACE FUNCTION public.get_public_maker_info(maker_user_id uuid)
RETURNS TABLE(display_name text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_name, role
  FROM public.profiles
  WHERE id = maker_user_id
    AND role IN ('maker', 'admin')
    AND maker_approved = true;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_maker_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_maker_info(uuid) TO anon;