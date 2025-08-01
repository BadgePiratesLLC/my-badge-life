-- Create table to track AI search feedback
CREATE TABLE public.ai_search_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  ai_result JSONB NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'spam')),
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_search_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all feedback for transparency" 
ON public.ai_search_feedback 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own feedback" 
ON public.ai_search_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create index for better performance
CREATE INDEX idx_ai_search_feedback_search_query ON public.ai_search_feedback(search_query);
CREATE INDEX idx_ai_search_feedback_feedback_type ON public.ai_search_feedback(feedback_type);