-- Create increment_points function
CREATE OR REPLACE FUNCTION public.increment_points(user_id_param uuid, points_param integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET points = points + points_param
  WHERE user_id = user_id_param;
END;
$$;