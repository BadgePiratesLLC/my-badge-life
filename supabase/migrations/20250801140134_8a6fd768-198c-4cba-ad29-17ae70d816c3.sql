-- Create badge_embeddings table for storing vector embeddings
CREATE TABLE public.badge_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  embedding REAL[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index to prevent duplicate embeddings for the same badge
CREATE UNIQUE INDEX idx_badge_embeddings_badge_id ON public.badge_embeddings(badge_id);

-- Create index for embedding similarity searches (if using vector extensions in future)
CREATE INDEX idx_badge_embeddings_embedding ON public.badge_embeddings USING GIN(embedding);

-- Enable Row Level Security
ALTER TABLE public.badge_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies for badge embeddings
CREATE POLICY "Badge embeddings are viewable by everyone" 
ON public.badge_embeddings 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage badge embeddings" 
ON public.badge_embeddings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_badge_embeddings_updated_at
BEFORE UPDATE ON public.badge_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();