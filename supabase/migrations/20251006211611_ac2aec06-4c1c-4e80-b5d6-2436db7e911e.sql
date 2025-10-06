-- Fix security issue: Restrict web_search_sources table to admin-only access
-- Remove the public SELECT policy that allows anyone to view API endpoints and prompts

DROP POLICY IF EXISTS "Web search sources are viewable by everyone" ON public.web_search_sources;

-- The existing "Only admins can manage web search sources" policy already handles admin SELECT access
-- So we don't need to create a new policy - admins can already read via the ALL command policy