-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'maker', 'admin')),
  wants_to_be_maker BOOLEAN NOT NULL DEFAULT false,
  maker_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  maker_id UUID REFERENCES public.profiles(id),
  year INTEGER,
  image_url TEXT,
  description TEXT,
  external_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ownership table
CREATE TABLE public.ownership (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('own', 'want')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id, status)
);

-- Create uploads table
CREATE TABLE public.uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  badge_guess_id UUID REFERENCES public.badges(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for badges
CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Makers can create badges" ON public.badges FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'maker' AND maker_approved = true) OR role = 'admin'
  )
);
CREATE POLICY "Makers can update their own badges" ON public.badges FOR UPDATE USING (
  maker_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'maker' AND maker_approved = true) OR role = 'admin'
  )
);

-- Create RLS policies for ownership
CREATE POLICY "Users can view their own ownership" ON public.ownership FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own ownership" ON public.ownership FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ownership" ON public.ownership FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ownership" ON public.ownership FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for uploads
CREATE POLICY "Users can view their own uploads" ON public.uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own uploads" ON public.uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('badge-images', 'badge-images', true);

-- Create storage policies
CREATE POLICY "Badge images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'badge-images');
CREATE POLICY "Users can upload badge images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'badge-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update their own badge images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'badge-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON public.badges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();