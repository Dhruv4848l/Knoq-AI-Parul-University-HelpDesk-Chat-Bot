ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS semester text,
  ADD COLUMN IF NOT EXISTS hostel text;