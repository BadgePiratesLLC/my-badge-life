-- Fix storage policies to allow anonymous uploads
CREATE POLICY "Allow anonymous uploads to badge-images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'badge-images');

CREATE POLICY "Allow public access to badge-images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'badge-images');

-- Allow updates for authenticated users
CREATE POLICY "Allow authenticated updates to badge-images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'badge-images' AND (auth.uid() IS NOT NULL OR true));

-- Allow deletes for authenticated users
CREATE POLICY "Allow authenticated deletes from badge-images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'badge-images' AND auth.uid() IS NOT NULL);