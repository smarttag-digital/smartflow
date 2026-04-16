
-- Create enum for user status
CREATE TYPE public.user_account_status AS ENUM ('pending', 'approved', 'rejected', 'blocked');

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User status table
CREATE TABLE public.user_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status public.user_account_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id UUID)
RETURNS public.user_account_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.user_status WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS for user_status
CREATE POLICY "Users can view their own status"
ON public.user_status FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all statuses"
ON public.user_status FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any status"
ON public.user_status FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-create user_status on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_status (user_id, status)
  VALUES (NEW.id, 'pending');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_status
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_status();

-- Trigger for updated_at
CREATE TRIGGER update_user_status_updated_at
BEFORE UPDATE ON public.user_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
