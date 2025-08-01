-- Create table to track user confirmations of badge matches
CREATE TABLE public.badge_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL,
  confidence_at_time INTEGER NOT NULL,
  similarity_score DECIMAL(5,4) NOT NULL,
  confirmation_type TEXT NOT NULL CHECK (confirmation_type IN ('correct_match', 'incorrect_match')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badge_confirmations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all confirmations" 
ON public.badge_confirmations 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own confirmations" 
ON public.badge_confirmations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create index for better performance
CREATE INDEX idx_badge_confirmations_badge_id ON public.badge_confirmations(badge_id);
CREATE INDEX idx_badge_confirmations_user_id ON public.badge_confirmations(user_id);