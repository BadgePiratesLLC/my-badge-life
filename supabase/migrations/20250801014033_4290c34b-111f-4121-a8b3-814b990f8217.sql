-- Add retired field to badges table
ALTER TABLE public.badges 
ADD COLUMN retired boolean NOT NULL DEFAULT false;