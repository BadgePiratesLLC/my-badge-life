-- Create badge_images table for multiple images per badge
CREATE TABLE public.badge_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 1,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badge_images ENABLE ROW LEVEL SECURITY;

-- Create policies for badge_images
CREATE POLICY "Badge images are viewable by everyone" 
ON public.badge_images 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage badge images" 
ON public.badge_images 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Makers can manage their team badge images" 
ON public.badge_images 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.badges b
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE b.id = badge_images.badge_id
    AND (
      p.role = 'admin'::text 
      OR (
        p.role = 'maker'::text 
        AND p.maker_approved = true 
        AND p.assigned_team = b.team_name
      )
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_badge_images_badge_id ON public.badge_images(badge_id);
CREATE INDEX idx_badge_images_primary ON public.badge_images(badge_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_badge_images_order ON public.badge_images(badge_id, display_order);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_badge_images_updated_at
BEFORE UPDATE ON public.badge_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing badge images to the new table
-- Insert existing badge images as primary images
INSERT INTO public.badge_images (badge_id, image_url, is_primary, display_order)
SELECT id, image_url, true, 1
FROM public.badges 
WHERE image_url IS NOT NULL;

-- Create a function to ensure only one primary image per badge
CREATE OR REPLACE FUNCTION public.ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting an image as primary, unset all other primary images for this badge
  IF NEW.is_primary = true THEN
    UPDATE public.badge_images 
    SET is_primary = false 
    WHERE badge_id = NEW.badge_id 
    AND id != NEW.id 
    AND is_primary = true;
  END IF;
  
  -- If no primary image exists for this badge, make this one primary
  IF NOT EXISTS (
    SELECT 1 FROM public.badge_images 
    WHERE badge_id = NEW.badge_id 
    AND is_primary = true 
    AND id != NEW.id
  ) THEN
    NEW.is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single primary image
CREATE TRIGGER ensure_single_primary_image_trigger
BEFORE INSERT OR UPDATE ON public.badge_images
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_primary_image();