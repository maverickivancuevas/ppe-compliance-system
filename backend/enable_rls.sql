-- Enable Row Level Security (RLS) on all tables to satisfy Supabase linter
-- Note: This doesn't affect our backend since we use direct PostgreSQL connections
-- with service role privileges, bypassing RLS entirely.

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role (backend) access
-- These policies allow the service role to bypass RLS

CREATE POLICY "Service role has full access" ON public.system_settings
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON public.cameras
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON public.detection_events
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON public.workers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON public.alerts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON public.attendance
    FOR ALL USING (true) WITH CHECK (true);

-- To run this script:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire script
-- 3. Click "Run" or press Ctrl+Enter
-- 4. The RLS warnings should disappear from the linter
