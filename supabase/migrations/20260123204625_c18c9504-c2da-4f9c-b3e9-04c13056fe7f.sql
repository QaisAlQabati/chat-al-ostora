-- Create storage bucket for profile backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-backgrounds', 'profile-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-backgrounds bucket
CREATE POLICY "Profile backgrounds are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-backgrounds');

CREATE POLICY "Users can upload their own profile background"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-backgrounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile background"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-backgrounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile background"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-backgrounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create chat_rooms table for public chat rooms (different from live rooms)
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  icon VARCHAR DEFAULT '🏠',
  background_url TEXT,
  background_color VARCHAR DEFAULT '#1a1a2e',
  password_hash VARCHAR,
  is_password_protected BOOLEAN DEFAULT false,
  max_members INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  welcome_message TEXT,
  pinned_message TEXT,
  allow_private_messages BOOLEAN DEFAULT true,
  allow_emojis BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Only owner can create/manage chat rooms
CREATE POLICY "Chat rooms are viewable by everyone"
ON public.chat_rooms FOR SELECT
USING (is_active = true);

CREATE POLICY "Only owner can create chat rooms"
ON public.chat_rooms FOR INSERT
WITH CHECK (is_owner(auth.uid()));

CREATE POLICY "Only owner can update chat rooms"
ON public.chat_rooms FOR UPDATE
USING (is_owner(auth.uid()));

CREATE POLICY "Only owner can delete chat rooms"
ON public.chat_rooms FOR DELETE
USING (is_owner(auth.uid()));

-- Create chat_room_members table
CREATE TABLE public.chat_room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE,
  banned_by UUID,
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMP WITH TIME ZONE,
  font_color VARCHAR DEFAULT '#ffffff',
  font_size VARCHAR DEFAULT 'medium',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS on chat_room_members
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_room_members
CREATE POLICY "Room members are viewable by everyone"
ON public.chat_room_members FOR SELECT
USING (true);

CREATE POLICY "Owner can manage all members"
ON public.chat_room_members FOR ALL
USING (is_owner(auth.uid()));

CREATE POLICY "Users can join rooms"
ON public.chat_room_members FOR INSERT
WITH CHECK (auth.uid() = user_id AND NOT is_banned);

CREATE POLICY "Users can update their own membership"
ON public.chat_room_members FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Moderators can update members in their room"
ON public.chat_room_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_members m
    WHERE m.room_id = chat_room_members.room_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'moderator')
  )
);

-- Create chat_room_messages table
CREATE TABLE public.chat_room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'announcement', 'warning')),
  is_deleted BOOLEAN DEFAULT false,
  deleted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on chat_room_messages
ALTER TABLE public.chat_room_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_room_messages
CREATE POLICY "Messages are viewable by room members"
ON public.chat_room_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_members m
    WHERE m.room_id = chat_room_messages.room_id
    AND m.user_id = auth.uid()
    AND NOT m.is_banned
  )
);

CREATE POLICY "Members can send messages"
ON public.chat_room_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.chat_room_members m
    WHERE m.room_id = chat_room_messages.room_id
    AND m.user_id = auth.uid()
    AND NOT m.is_banned
    AND NOT m.is_muted
  )
);

CREATE POLICY "Moderators can delete messages"
ON public.chat_room_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_members m
    WHERE m.room_id = chat_room_messages.room_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'moderator')
  )
);

CREATE POLICY "Owner can manage all messages"
ON public.chat_room_messages FOR ALL
USING (is_owner(auth.uid()));

-- Enable realtime for chat rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_messages;

-- Create trigger for updated_at on chat_rooms
CREATE TRIGGER update_chat_rooms_updated_at
BEFORE UPDATE ON public.chat_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();