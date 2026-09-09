CREATE UNIQUE INDEX IF NOT EXISTS api_credentials_one_active_per_user_idx
  ON public.api_credentials(user_id)
  WHERE active;