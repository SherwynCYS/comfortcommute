ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_permission TEXT,
  ADD COLUMN IF NOT EXISTS notification_permission TEXT;