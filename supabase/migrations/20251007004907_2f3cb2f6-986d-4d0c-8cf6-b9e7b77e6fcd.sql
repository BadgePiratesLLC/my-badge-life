-- Drop existing admin-only policies for uploads
DROP POLICY IF EXISTS "Admins can view all uploads" ON public.uploads;
DROP POLICY IF EXISTS "Admins can delete any upload" ON public.uploads;

-- Create new policies that allow both admins and moderators
CREATE POLICY "Admins and moderators can view all uploads"
ON public.uploads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Admins and moderators can delete uploads"
ON public.uploads
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Also update badge_images policies to allow moderators full access
DROP POLICY IF EXISTS "Admins can manage badge images" ON public.badge_images;

CREATE POLICY "Admins and moderators can manage badge images"
ON public.badge_images
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);