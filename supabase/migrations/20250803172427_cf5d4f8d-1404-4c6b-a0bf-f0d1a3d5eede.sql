-- Update email preferences table to make notifications opt-in (disabled by default)
ALTER TABLE public.email_preferences 
ALTER COLUMN badge_submission_notifications SET DEFAULT false;

ALTER TABLE public.email_preferences 
ALTER COLUMN badge_approval_notifications SET DEFAULT false;

ALTER TABLE public.email_preferences 
ALTER COLUMN badge_rejection_notifications SET DEFAULT false;

ALTER TABLE public.email_preferences 
ALTER COLUMN weekly_digest_emails SET DEFAULT false;

ALTER TABLE public.email_preferences 
ALTER COLUMN system_announcements SET DEFAULT false;