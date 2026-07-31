ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_name text,
  ADD COLUMN IF NOT EXISTS home_lat double precision,
  ADD COLUMN IF NOT EXISTS home_lng double precision,
  ADD COLUMN IF NOT EXISTS work_name text,
  ADD COLUMN IF NOT EXISTS work_lat double precision,
  ADD COLUMN IF NOT EXISTS work_lng double precision,
  ADD COLUMN IF NOT EXISTS occupation text NOT NULL DEFAULT 'adult',
  ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'adult_card',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();