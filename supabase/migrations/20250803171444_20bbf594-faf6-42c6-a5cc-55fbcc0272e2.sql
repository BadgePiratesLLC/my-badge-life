-- Create email preferences table for user notification settings
CREATE TABLE public.email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_submission_notifications BOOLEAN NOT NULL DEFAULT true,
  badge_approval_notifications BOOLEAN NOT NULL DEFAULT true,
  badge_rejection_notifications BOOLEAN NOT NULL DEFAULT true,
  weekly_digest_emails BOOLEAN NOT NULL DEFAULT true,
  system_announcements BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for email preferences
CREATE POLICY "Users can view their own email preferences" 
ON public.email_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences" 
ON public.email_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences" 
ON public.email_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_preferences_updated_at
BEFORE UPDATE ON public.email_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint to ensure one preference record per user
ALTER TABLE public.email_preferences 
ADD CONSTRAINT email_preferences_user_id_unique UNIQUE (user_id);