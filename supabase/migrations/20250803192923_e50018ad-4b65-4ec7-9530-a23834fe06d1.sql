-- Enable real-time updates for ownership table
ALTER TABLE public.ownership REPLICA IDENTITY FULL;

-- Add ownership table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ownership;