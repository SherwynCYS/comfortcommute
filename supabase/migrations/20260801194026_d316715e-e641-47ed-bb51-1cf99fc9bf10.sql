CREATE TABLE public.favorite_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  label TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_places TO authenticated;
GRANT ALL ON public.favorite_places TO service_role;
ALTER TABLE public.favorite_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own places" ON public.favorite_places FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TYPE public.incident_type AS ENUM ('crowding','breakdown','delay','no_show','accessibility','police','hazard','other');

CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type public.incident_type NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  bus_stop_code TEXT,
  service_no TEXT,
  confirms INTEGER NOT NULL DEFAULT 0,
  dismisses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '3 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_reports TO authenticated;
GRANT ALL ON public.incident_reports TO service_role;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read reports" ON public.incident_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own reports" ON public.incident_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reports" ON public.incident_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reports" ON public.incident_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.incident_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.incident_reports ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  is_confirm BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_votes TO authenticated;
GRANT ALL ON public.incident_votes TO service_role;
ALTER TABLE public.incident_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in can read votes" ON public.incident_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own votes" ON public.incident_votes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reports_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_incident_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target UUID;
BEGIN
  target := COALESCE(NEW.report_id, OLD.report_id);
  UPDATE public.incident_reports r
  SET confirms = (SELECT count(*) FROM public.incident_votes v WHERE v.report_id = target AND v.is_confirm),
      dismisses = (SELECT count(*) FROM public.incident_votes v WHERE v.report_id = target AND NOT v.is_confirm)
  WHERE r.id = target;
  RETURN NULL;
END;
$$;

CREATE TRIGGER incident_votes_sync
AFTER INSERT OR UPDATE OR DELETE ON public.incident_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_incident_vote_counts();

ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports;