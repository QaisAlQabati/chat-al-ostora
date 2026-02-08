-- Add mic settings and room control columns to chat_rooms
ALTER TABLE public.chat_rooms
ADD COLUMN IF NOT EXISTS mic_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mic_count integer DEFAULT 4 CHECK (mic_count >= 1 AND mic_count <= 8),
ADD COLUMN IF NOT EXISTS mic_time_limit integer DEFAULT 300,
ADD COLUMN IF NOT EXISTS allow_mic_requests boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_songs boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mic_points_reward integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_chat_muted boolean DEFAULT false;

-- Create room_mic_slots table for tracking who's on which mic
CREATE TABLE public.room_mic_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  slot_number integer NOT NULL CHECK (slot_number >= 1 AND slot_number <= 8),
  user_id UUID NOT NULL,
  is_muted boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  started_at timestamp with time zone DEFAULT now(),
  UNIQUE(room_id, slot_number)
);

-- Create mic_requests table for users requesting to join mic
CREATE TABLE public.room_mic_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  requested_slot integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  responded_by UUID,
  UNIQUE(room_id, user_id, status)
);

-- Enable RLS on new tables
ALTER TABLE public.room_mic_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_mic_requests ENABLE ROW LEVEL SECURITY;

-- Policies for room_mic_slots
CREATE POLICY "Anyone can view mic slots"
  ON public.room_mic_slots
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join mic"
  ON public.room_mic_slots
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can leave their own slot"
  ON public.room_mic_slots
  FOR DELETE
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update mic slots"
  ON public.room_mic_slots
  FOR UPDATE
  USING (public.has_min_role(auth.uid(), 'moderator'));

-- Policies for room_mic_requests
CREATE POLICY "Anyone can view mic requests"
  ON public.room_mic_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can request mic"
  ON public.room_mic_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own requests"
  ON public.room_mic_requests
  FOR DELETE
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update mic requests"
  ON public.room_mic_requests
  FOR UPDATE
  USING (public.has_min_role(auth.uid(), 'moderator'));

-- Enable realtime for mic slots
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_mic_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_mic_requests;