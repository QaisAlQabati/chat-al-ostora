-- Create a function to get user's highest role level (returns number)
CREATE OR REPLACE FUNCTION public.get_role_level(_role user_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _role
    WHEN 'owner' THEN 6
    WHEN 'super_owner' THEN 6
    WHEN 'super_admin' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'moderator' THEN 3
    WHEN 'vip' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END
$$;

-- Create function to get user's max role level
CREATE OR REPLACE FUNCTION public.get_user_max_role_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(public.get_role_level(role)), 0)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Create function to check if user has minimum role level
CREATE OR REPLACE FUNCTION public.has_min_role(_user_id uuid, _min_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_max_role_level(_user_id) >= public.get_role_level(_min_role)
$$;

-- Create function to check if user can manage another user (has higher role)
CREATE OR REPLACE FUNCTION public.can_manage_user(_manager_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_max_role_level(_manager_id) > public.get_user_max_role_level(_target_id)
$$;

-- Create table for user settings/preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name_color varchar(20) DEFAULT '#ffffff',
  font_color varchar(20) DEFAULT '#ffffff',
  name_glow boolean DEFAULT false,
  can_send_media boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can manage all settings"
  ON public.user_settings FOR ALL
  USING (is_owner(auth.uid()));