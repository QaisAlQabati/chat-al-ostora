-- Table for mic invitations
CREATE TABLE public.mic_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired
  mic_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.mic_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their invitations" ON public.mic_invitations
  FOR SELECT USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Room owners can create invitations" ON public.mic_invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Invitees can update their invitations" ON public.mic_invitations
  FOR UPDATE USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Users can delete their invitations" ON public.mic_invitations
  FOR DELETE USING (inviter_id = auth.uid());

-- Table for PK Battles
CREATE TABLE public.pk_battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  battle_type VARCHAR NOT NULL DEFAULT '1v1', -- 1v1, 2v2
  status VARCHAR NOT NULL DEFAULT 'waiting', -- waiting, active, ended
  duration_seconds INTEGER NOT NULL DEFAULT 180,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  team_a_users UUID[] DEFAULT '{}',
  team_b_users UUID[] DEFAULT '{}',
  team_a_points INTEGER DEFAULT 0,
  team_b_points INTEGER DEFAULT 0,
  winner_team VARCHAR, -- A, B, or draw
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.pk_battles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "PK battles are viewable by everyone" ON public.pk_battles
  FOR SELECT USING (true);

CREATE POLICY "Room owners can create battles" ON public.pk_battles
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Battle creators can update" ON public.pk_battles
  FOR UPDATE USING (created_by = auth.uid());

-- Table for live settings
CREATE TABLE public.live_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  max_mic_count INTEGER DEFAULT 4,
  is_password_protected BOOLEAN DEFAULT false,
  password_hash VARCHAR,
  allow_music BOOLEAN DEFAULT true,
  allow_games BOOLEAN DEFAULT true,
  allow_gifts BOOLEAN DEFAULT true,
  chat_enabled BOOLEAN DEFAULT true,
  background_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Settings viewable by everyone" ON public.live_settings
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their settings" ON public.live_settings
  FOR ALL USING (user_id = auth.uid());

-- Add new columns to live_room_members for guest status
ALTER TABLE public.live_room_members 
  ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_muted_by_owner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS camera_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mic_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN DEFAULT false;

-- Update RLS for live_room_members to allow updates
DROP POLICY IF EXISTS "Room members viewable by everyone" ON public.live_room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON public.live_room_members;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.live_room_members;

CREATE POLICY "Room members viewable by everyone" ON public.live_room_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join rooms" ON public.live_room_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their membership" ON public.live_room_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.live_room_members
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.mic_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pk_battles;

-- Create default live settings trigger
CREATE OR REPLACE FUNCTION public.create_default_live_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.live_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create default settings when user registers
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_live_settings();