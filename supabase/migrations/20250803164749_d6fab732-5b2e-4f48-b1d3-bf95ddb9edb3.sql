-- Create API call logs table for tracking all external API usage
CREATE TABLE public.api_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  api_provider TEXT NOT NULL, -- 'openai', 'serpapi', 'replicate', 'perplexity'
  endpoint TEXT NOT NULL, -- specific endpoint or function called
  method TEXT NOT NULL, -- HTTP method
  request_data JSONB, -- sanitized request data (no API keys)
  response_status INTEGER, -- HTTP status code
  response_time_ms INTEGER, -- duration in milliseconds
  tokens_used INTEGER, -- for OpenAI calls
  estimated_cost_usd DECIMAL(10,6), -- estimated cost in USD
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "API call logs can be inserted by anyone" 
ON public.api_call_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Only admins can view API call logs" 
ON public.api_call_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for better performance
CREATE INDEX idx_api_call_logs_provider ON public.api_call_logs(api_provider);
CREATE INDEX idx_api_call_logs_created_at ON public.api_call_logs(created_at);
CREATE INDEX idx_api_call_logs_success ON public.api_call_logs(success);
CREATE INDEX idx_api_call_logs_user_id ON public.api_call_logs(user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_api_call_logs_updated_at
  BEFORE UPDATE ON public.api_call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();