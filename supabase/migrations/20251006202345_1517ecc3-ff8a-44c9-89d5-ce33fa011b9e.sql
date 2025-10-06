-- Create team_requests table for pending team creation requests
CREATE TABLE IF NOT EXISTS public.team_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_name TEXT NOT NULL,
  team_description TEXT,
  team_website_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own team requests"
ON public.team_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create team requests
CREATE POLICY "Users can create team requests"
ON public.team_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all team requests
CREATE POLICY "Admins can view all team requests"
ON public.team_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update team requests (approve/reject)
CREATE POLICY "Admins can update team requests"
ON public.team_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete team requests
CREATE POLICY "Admins can delete team requests"
ON public.team_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_team_requests_updated_at
BEFORE UPDATE ON public.team_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();