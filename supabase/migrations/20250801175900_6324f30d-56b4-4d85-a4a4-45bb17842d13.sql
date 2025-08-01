-- Create analytics_sessions table to track user sessions and platform info
CREATE TABLE public.analytics_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  platform TEXT,
  browser TEXT,
  device_type TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_searches table to track search activities
CREATE TABLE public.analytics_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  search_type TEXT NOT NULL, -- 'image_upload', 'camera_capture'
  search_duration_ms INTEGER,
  ai_analysis_duration_ms INTEGER,
  image_matching_duration_ms INTEGER,
  web_search_duration_ms INTEGER,
  total_duration_ms INTEGER,
  results_found INTEGER DEFAULT 0,
  best_confidence_score NUMERIC,
  search_source_used TEXT, -- 'local_database', 'web_search', 'image_matching'
  web_search_sources_tried TEXT[], -- array of source names tried
  found_in_database BOOLEAN DEFAULT false,
  found_via_web_search BOOLEAN DEFAULT false,
  found_via_image_matching BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_badge_interactions table to track badge-related activities
CREATE TABLE public.analytics_badge_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL, -- 'view', 'ownership_toggle', 'detail_view'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all analytics tables
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_badge_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analytics tables (admin only read access)
CREATE POLICY "Only admins can view analytics sessions" 
ON public.analytics_sessions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analytics sessions can be inserted by anyone" 
ON public.analytics_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Analytics sessions can be updated by session owner" 
ON public.analytics_sessions 
FOR UPDATE 
USING (session_id = current_setting('myapp.session_id', true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can view analytics searches" 
ON public.analytics_searches 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analytics searches can be inserted by anyone" 
ON public.analytics_searches 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Only admins can view badge interactions" 
ON public.analytics_badge_interactions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Badge interactions can be inserted by anyone" 
ON public.analytics_badge_interactions 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_analytics_sessions_user_id ON public.analytics_sessions(user_id);
CREATE INDEX idx_analytics_sessions_created_at ON public.analytics_sessions(created_at);
CREATE INDEX idx_analytics_sessions_session_id ON public.analytics_sessions(session_id);

CREATE INDEX idx_analytics_searches_user_id ON public.analytics_searches(user_id);
CREATE INDEX idx_analytics_searches_created_at ON public.analytics_searches(created_at);
CREATE INDEX idx_analytics_searches_session_id ON public.analytics_searches(session_id);
CREATE INDEX idx_analytics_searches_search_source ON public.analytics_searches(search_source_used);

CREATE INDEX idx_analytics_badge_interactions_user_id ON public.analytics_badge_interactions(user_id);
CREATE INDEX idx_analytics_badge_interactions_badge_id ON public.analytics_badge_interactions(badge_id);
CREATE INDEX idx_analytics_badge_interactions_created_at ON public.analytics_badge_interactions(created_at);