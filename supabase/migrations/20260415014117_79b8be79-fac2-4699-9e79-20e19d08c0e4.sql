ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name text DEFAULT 'Smart Tag';