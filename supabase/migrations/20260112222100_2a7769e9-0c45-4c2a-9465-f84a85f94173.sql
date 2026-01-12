-- ==========================================
-- Social Media Platform Database Schema
-- ==========================================

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('user', 'moderator', 'admin', 'super_owner');

-- Create gender enum
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- Create user status enum
CREATE TYPE public.user_status AS ENUM ('online', 'offline', 'busy', 'in_live');

-- Create VIP type enum
CREATE TYPE public.vip_type AS ENUM ('gold', 'diamond');

-- Create gift rarity enum
CREATE TYPE public.gift_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');

-- Create message type enum
CREATE TYPE public.message_type AS ENUM ('text', 'image', 'video', 'audio', 'gift');

-- ==========================================
-- Profiles Table (Main User Data)
-- ==========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  profile_picture TEXT,
  cover_picture TEXT,
  bio VARCHAR(500) DEFAULT '',
  birth_date DATE,
  gender gender_type DEFAULT 'prefer_not_to_say',
  country VARCHAR(100) DEFAULT '',
  city VARCHAR(100) DEFAULT '',
  languages JSONB DEFAULT '["ar"]'::jsonb,
  interests JSONB DEFAULT '[]'::jsonb,
  
  -- Currency
  points INTEGER DEFAULT 100,
  ruby INTEGER DEFAULT 10,
  diamonds INTEGER DEFAULT 0,
  
  -- Level & XP
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  
  -- Status
  status user_status DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- VIP
  is_vip BOOLEAN DEFAULT FALSE,
  vip_type vip_type,
  vip_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  
  -- Ban
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  ban_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Statistics
  total_time_online INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  total_gifts_sent INTEGER DEFAULT 0,
  total_gifts_received INTEGER DEFAULT 0,
  total_lives_started INTEGER DEFAULT 0,
  total_stories_posted INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- User Roles Table (Separate for Security)
-- ==========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ==========================================
-- Stories Table
-- ==========================================
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'image',
  caption TEXT,
  location TEXT,
  hashtags JSONB DEFAULT '[]'::jsonb,
  mentions JSONB DEFAULT '[]'::jsonb,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- Story Views Table
-- ==========================================
CREATE TABLE public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

-- ==========================================
-- Gifts Table (Available Gifts)
-- ==========================================
CREATE TABLE public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  price_points INTEGER NOT NULL DEFAULT 10,
  price_ruby INTEGER DEFAULT 0,
  rarity gift_rarity DEFAULT 'common',
  category VARCHAR(50) DEFAULT 'other',
  has_sound BOOLEAN DEFAULT FALSE,
  has_animation BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- Sent Gifts Table
-- ==========================================
CREATE TABLE public.sent_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID REFERENCES public.gifts(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  total_points INTEGER NOT NULL,
  context VARCHAR(50) DEFAULT 'live',
  live_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- Conversations Table (Private Chats)
-- ==========================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant_two UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (participant_one, participant_two)
);

-- ==========================================
-- Messages Table
-- ==========================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  message_type message_type DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- Friendships Table
-- ==========================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id, friend_id)
);

-- ==========================================
-- Followers Table
-- ==========================================
CREATE TABLE public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

-- ==========================================
-- Personal Lives Table
-- ==========================================
CREATE TABLE public.personal_lives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  title VARCHAR(200),
  description TEXT,
  category VARCHAR(50) DEFAULT 'chat',
  is_live BOOLEAN DEFAULT FALSE,
  viewer_count INTEGER DEFAULT 0,
  total_gifts INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- Public Live Rooms Table (Owner Only)
-- ==========================================
CREATE TABLE public.public_live_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  cover_image TEXT,
  category VARCHAR(50) DEFAULT 'chat',
  max_users INTEGER DEFAULT 100,
  mic_count INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT TRUE,
  is_vip_only BOOLEAN DEFAULT FALSE,
  min_level INTEGER DEFAULT 0,
  current_users INTEGER DEFAULT 0,
  total_gifts INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- Live Room Members Table
-- ==========================================
CREATE TABLE public.live_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.public_live_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_on_mic BOOLEAN DEFAULT FALSE,
  mic_position INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (room_id, user_id)
);

-- ==========================================
-- Frames Table
-- ==========================================
CREATE TABLE public.frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  frame_type VARCHAR(50) DEFAULT 'profile',
  price_points INTEGER DEFAULT 100,
  price_ruby INTEGER DEFAULT 0,
  rarity gift_rarity DEFAULT 'common',
  min_level INTEGER DEFAULT 0,
  is_vip_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- User Frames Table
-- ==========================================
CREATE TABLE public.user_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  frame_id UUID REFERENCES public.frames(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, frame_id)
);

-- ==========================================
-- Badges Table
-- ==========================================
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  icon TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  requirement_type VARCHAR(50),
  requirement_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- User Badges Table
-- ==========================================
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

-- ==========================================
-- Transactions Table
-- ==========================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  currency VARCHAR(20) NOT NULL DEFAULT 'points',
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- Reports Table
-- ==========================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_type VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  evidence_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- News/Announcements Table
-- ==========================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  image_url TEXT,
  is_important BOOLEAN DEFAULT FALSE,
  target_audience VARCHAR(50) DEFAULT 'everyone',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- Enable Row Level Security
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_live_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Security Definer Function for Roles
-- ==========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.email = 'njdj9985@gmail.com'
  )
$$;

-- ==========================================
-- RLS Policies for Profiles
-- ==========================================
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- RLS Policies for User Roles
-- ==========================================
CREATE POLICY "Roles viewable by owner" 
ON public.user_roles FOR SELECT 
USING (public.is_owner(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Only owner can manage roles"
ON public.user_roles FOR ALL
USING (public.is_owner(auth.uid()));

-- ==========================================
-- RLS Policies for Stories
-- ==========================================
CREATE POLICY "Stories are viewable by everyone" 
ON public.stories FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create their own stories" 
ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" 
ON public.stories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- RLS Policies for Story Views
-- ==========================================
CREATE POLICY "Story views are viewable by story owner" 
ON public.story_views FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = story_views.story_id 
    AND stories.user_id = auth.uid()
  ) OR viewer_id = auth.uid()
);

CREATE POLICY "Users can add their own views" 
ON public.story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- ==========================================
-- RLS Policies for Gifts
-- ==========================================
CREATE POLICY "Gifts are viewable by everyone" 
ON public.gifts FOR SELECT USING (is_active = true);

CREATE POLICY "Only owner can manage gifts"
ON public.gifts FOR ALL USING (public.is_owner(auth.uid()));

-- ==========================================
-- RLS Policies for Sent Gifts
-- ==========================================
CREATE POLICY "Sent gifts viewable by sender or receiver"
ON public.sent_gifts FOR SELECT 
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send gifts"
ON public.sent_gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ==========================================
-- RLS Policies for Conversations
-- ==========================================
CREATE POLICY "Conversations viewable by participants"
ON public.conversations FOR SELECT 
USING (participant_one = auth.uid() OR participant_two = auth.uid());

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

-- ==========================================
-- RLS Policies for Messages
-- ==========================================
CREATE POLICY "Messages viewable by conversation participants"
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
  )
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE 
USING (auth.uid() = sender_id);

-- ==========================================
-- RLS Policies for Friendships
-- ==========================================
CREATE POLICY "Friendships viewable by involved users"
ON public.friendships FOR SELECT 
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friend requests"
ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendships"
ON public.friendships FOR UPDATE 
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete their friendships"
ON public.friendships FOR DELETE 
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- ==========================================
-- RLS Policies for Followers
-- ==========================================
CREATE POLICY "Followers are viewable by everyone"
ON public.followers FOR SELECT USING (true);

CREATE POLICY "Users can follow others"
ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- ==========================================
-- RLS Policies for Personal Lives
-- ==========================================
CREATE POLICY "Personal lives are viewable by everyone"
ON public.personal_lives FOR SELECT USING (true);

CREATE POLICY "Users can manage their own live"
ON public.personal_lives FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- RLS Policies for Public Live Rooms
-- ==========================================
CREATE POLICY "Public rooms are viewable by everyone"
ON public.public_live_rooms FOR SELECT USING (is_active = true);

CREATE POLICY "Only owner can manage public rooms"
ON public.public_live_rooms FOR ALL USING (public.is_owner(auth.uid()));

-- ==========================================
-- RLS Policies for Live Room Members
-- ==========================================
CREATE POLICY "Room members viewable by everyone"
ON public.live_room_members FOR SELECT USING (true);

CREATE POLICY "Users can join rooms"
ON public.live_room_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
ON public.live_room_members FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- RLS Policies for Frames
-- ==========================================
CREATE POLICY "Frames are viewable by everyone"
ON public.frames FOR SELECT USING (is_active = true);

CREATE POLICY "Only owner can manage frames"
ON public.frames FOR ALL USING (public.is_owner(auth.uid()));

-- ==========================================
-- RLS Policies for User Frames
-- ==========================================
CREATE POLICY "User frames viewable by owner"
ON public.user_frames FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase frames"
ON public.user_frames FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their frames"
ON public.user_frames FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- RLS Policies for Badges
-- ==========================================
CREATE POLICY "Badges are viewable by everyone"
ON public.badges FOR SELECT USING (true);

CREATE POLICY "Only owner can manage badges"
ON public.badges FOR ALL USING (public.is_owner(auth.uid()));

-- ==========================================
-- RLS Policies for User Badges
-- ==========================================
CREATE POLICY "User badges are viewable by everyone"
ON public.user_badges FOR SELECT USING (true);

-- ==========================================
-- RLS Policies for Transactions
-- ==========================================
CREATE POLICY "Transactions viewable by owner"
ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create transactions"
ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- RLS Policies for Reports
-- ==========================================
CREATE POLICY "Reports viewable by reporter or admins"
ON public.reports FOR SELECT 
USING (reporter_id = auth.uid() OR public.is_owner(auth.uid()));

CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Only owner can manage reports"
ON public.reports FOR UPDATE USING (public.is_owner(auth.uid()));

-- ==========================================
-- RLS Policies for Announcements
-- ==========================================
CREATE POLICY "Announcements are viewable by everyone"
ON public.announcements FOR SELECT USING (is_active = true);

CREATE POLICY "Only owner can manage announcements"
ON public.announcements FOR ALL USING (public.is_owner(auth.uid()));

-- ==========================================
-- Triggers
-- ==========================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_username TEXT;
BEGIN
  new_username := 'user_' || substr(NEW.id::text, 1, 8);
  
  INSERT INTO public.profiles (user_id, username, display_name, email)
  VALUES (
    NEW.id,
    new_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', new_username),
    NEW.email
  );
  
  -- Create default personal live
  INSERT INTO public.personal_lives (user_id)
  VALUES (NEW.id);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- If this is the owner email, also assign super_owner role
  IF NEW.email = 'njdj9985@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_lives;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_room_members;

-- ==========================================
-- Insert Default Gifts
-- ==========================================
INSERT INTO public.gifts (name_ar, name_en, image_url, price_points, rarity, category) VALUES
('وردة', 'Rose', '🌹', 10, 'common', 'flowers'),
('قلب', 'Heart', '❤️', 15, 'common', 'hearts'),
('نجمة', 'Star', '⭐', 20, 'common', 'other'),
('باقة ورد', 'Bouquet', '💐', 50, 'rare', 'flowers'),
('خاتم', 'Ring', '💍', 200, 'epic', 'luxury'),
('تاج', 'Crown', '👑', 300, 'epic', 'luxury'),
('سيارة', 'Car', '🚗', 500, 'legendary', 'vehicles'),
('قلعة', 'Castle', '🏰', 1000, 'legendary', 'luxury'),
('صاروخ', 'Rocket', '🚀', 2000, 'legendary', 'vehicles'),
('ماسة', 'Diamond', '💎', 500, 'legendary', 'luxury');

-- ==========================================
-- Insert Default Badges
-- ==========================================
INSERT INTO public.badges (name_ar, name_en, icon, description_ar, description_en) VALUES
('نجم اللايف', 'Live Star', '🎤', 'بث 10 لايفات', 'Stream 10 lives'),
('ملك الدردشة', 'Chat King', '💬', 'أرسل 1000 رسالة', 'Send 1000 messages'),
('كريم', 'Generous', '🎁', 'أرسل 50 هدية', 'Send 50 gifts'),
('عضو VIP', 'VIP Member', '⭐', 'اشترك في VIP', 'Subscribe to VIP'),
('100 صديق', '100 Friends', '👥', 'أضف 100 صديق', 'Add 100 friends'),
('أول استوري', 'First Story', '📱', 'انشر أول استوري', 'Post first story'),
('المستوى 10', 'Level 10', '🏆', 'وصل للمستوى 10', 'Reach level 10'),
('محترف الألعاب', 'Game Pro', '🎮', 'فز في 10 ألعاب', 'Win 10 games');

-- ==========================================
-- Insert Default Frames
-- ==========================================
INSERT INTO public.frames (name_ar, name_en, image_url, frame_type, price_points, rarity) VALUES
('إطار ذهبي', 'Gold Frame', 'gold', 'profile', 500, 'rare'),
('إطار فضي', 'Silver Frame', 'silver', 'profile', 300, 'common'),
('إطار ماسي', 'Diamond Frame', 'diamond', 'profile', 1000, 'epic'),
('إطار ناري', 'Fire Frame', 'fire', 'profile', 800, 'rare'),
('إطار جليدي', 'Ice Frame', 'ice', 'profile', 800, 'rare'),
('إطار نيون', 'Neon Frame', 'neon', 'profile', 600, 'rare'),
('إطار ملكي', 'Royal Frame', 'royal', 'profile', 2000, 'legendary');