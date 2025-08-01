-- Create web search sources configuration table
CREATE TABLE public.web_search_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.web_search_sources ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Web search sources are viewable by everyone" 
ON public.web_search_sources 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage web search sources" 
ON public.web_search_sources 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_web_search_sources_updated_at
BEFORE UPDATE ON public.web_search_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default general web search configuration
INSERT INTO public.web_search_sources (name, url, prompt_template, priority, enabled) VALUES 
('General Web Search', 'https://api.perplexity.ai/chat/completions', 'Find information about "{query}" badge. Return JSON: {name, maker, year, event, description, external_link, confidence}. Include source URLs in external_link field.', 1, true);

-- Insert optional search sources (disabled by default)
INSERT INTO public.web_search_sources (name, url, prompt_template, priority, enabled) VALUES 
('Tindie', 'https://api.perplexity.ai/chat/completions', 'Search Tindie.com for "{query}" badge. Return JSON: {name, maker, year, description, price, url, found: true/false}. Include the full Tindie URL in the url field.', 2, false),
('Hackaday', 'https://api.perplexity.ai/chat/completions', 'Search hackaday.io conference badge list for "{query}". Return JSON: {name, maker, year, event, description, url, found: true/false}. Include the full Hackaday URL in the url field.', 3, false);