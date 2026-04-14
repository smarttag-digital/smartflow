
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS next_action text DEFAULT '',
ADD COLUMN IF NOT EXISTS next_action_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lost_reason text DEFAULT '';
