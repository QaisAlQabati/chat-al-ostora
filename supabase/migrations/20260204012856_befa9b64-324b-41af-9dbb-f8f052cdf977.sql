-- Add is_pinned column to chat_rooms for room pinning
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Add room roles table for room-specific roles
CREATE TABLE IF NOT EXISTS public.room_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role varchar NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'vip_member', 'moderator', 'first_moderator', 'room_admin', 'vice_owner', 'room_owner')),
  expires_at timestamp with time zone DEFAULT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS on room_roles
ALTER TABLE public.room_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for room_roles
CREATE POLICY "Room roles viewable by everyone" ON public.room_roles FOR SELECT USING (true);
CREATE POLICY "Room owners and admins can manage roles" ON public.room_roles FOR ALL USING (
  is_owner(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.room_roles rr 
    WHERE rr.room_id = room_roles.room_id 
    AND rr.user_id = auth.uid() 
    AND rr.role IN ('room_owner', 'vice_owner', 'room_admin')
  )
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- NULL means global notification
  title_ar text NOT NULL,
  title_en text NOT NULL,
  content_ar text NOT NULL,
  content_en text NOT NULL,
  type varchar DEFAULT 'general',
  is_read boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their notifications or global ones" ON public.notifications FOR SELECT 
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Only admins can create notifications" ON public.notifications FOR INSERT 
  WITH CHECK (is_owner(auth.uid()) OR has_min_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can update their own notification read status" ON public.notifications FOR UPDATE 
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Create user_notification_reads table for tracking reads of global notifications
CREATE TABLE IF NOT EXISTS public.user_notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- Enable RLS on user_notification_reads
ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their notification reads" ON public.user_notification_reads FOR ALL USING (auth.uid() = user_id);

-- Add is_jail column to chat_rooms for jail room
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS is_jail boolean DEFAULT false;

-- Add jailed_in_room to profiles for tracking jailed users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS jailed_in_room uuid REFERENCES public.chat_rooms(id) ON DELETE SET NULL;

-- Add privacy settings to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS private_chat_setting varchar DEFAULT 'everyone' CHECK (private_chat_setting IN ('everyone', 'friends_only', 'followers_only', 'none'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS private_chat_password varchar DEFAULT NULL;

-- Create system_messages table for welcome messages
CREATE TABLE IF NOT EXISTS public.system_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  content text NOT NULL,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on system_messages
ALTER TABLE public.system_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own system messages" ON public.system_messages FOR SELECT USING (auth.uid() = user_id);

-- Add name_background to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS name_background varchar DEFAULT NULL;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_roles;