import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MicSlot {
  id: string;
  room_id: string;
  slot_number: number;
  user_id: string;
  is_muted: boolean;
  is_locked: boolean;
  started_at: string;
  profile?: {
    display_name: string;
    profile_picture: string | null;
    level: number;
  };
}

export interface MicRequest {
  id: string;
  room_id: string;
  user_id: string;
  requested_slot: number | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profile?: {
    display_name: string;
    profile_picture: string | null;
  };
}

export interface RoomMicSettings {
  mic_enabled: boolean;
  mic_count: number;
  mic_time_limit: number;
  allow_mic_requests: boolean;
  allow_songs: boolean;
  mic_points_reward: number;
  is_locked: boolean;
  is_chat_muted: boolean;
}

export const useRoomMics = (roomId: string | undefined) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<MicSlot[]>([]);
  const [requests, setRequests] = useState<MicRequest[]>([]);
  const [settings, setSettings] = useState<RoomMicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [mySlot, setMySlot] = useState<MicSlot | null>(null);
  const [myRequest, setMyRequest] = useState<MicRequest | null>(null);

  // Fetch room mic settings
  const fetchSettings = useCallback(async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from('chat_rooms')
      .select('mic_enabled, mic_count, mic_time_limit, allow_mic_requests, allow_songs, mic_points_reward, is_locked, is_chat_muted')
      .eq('id', roomId)
      .single();

    if (!error && data) {
      setSettings(data as RoomMicSettings);
    }
  }, [roomId]);

  // Fetch mic slots with profiles
  const fetchSlots = useCallback(async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from('room_mic_slots')
      .select('*')
      .eq('room_id', roomId)
      .order('slot_number', { ascending: true });

    if (error) {
      console.error('Error fetching mic slots:', error);
      return;
    }

    // Fetch profiles for each slot
    const slotsWithProfiles = await Promise.all(
      (data || []).map(async (slot) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, profile_picture, level')
          .eq('user_id', slot.user_id)
          .single();
        return { ...slot, profile };
      })
    );

    setSlots(slotsWithProfiles);
    
    // Check if current user is on a slot
    if (user) {
      const userSlot = slotsWithProfiles.find(s => s.user_id === user.id);
      setMySlot(userSlot || null);
    }
  }, [roomId, user]);

  // Fetch mic requests
  const fetchRequests = useCallback(async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from('room_mic_requests')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching mic requests:', error);
      return;
    }

    // Fetch profiles for each request
    const requestsWithProfiles = await Promise.all(
      (data || []).map(async (req) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, profile_picture')
          .eq('user_id', req.user_id)
          .single();
        return { 
          ...req, 
          profile,
          status: req.status as 'pending' | 'approved' | 'rejected'
        };
      })
    );

    setRequests(requestsWithProfiles);

    // Check if current user has a pending request
    if (user) {
      const userRequest = requestsWithProfiles.find(r => r.user_id === user.id);
      setMyRequest(userRequest ?? null);
    }
  }, [roomId, user]);

  // Request to join mic
  const requestMic = async (slotNumber?: number) => {
    if (!roomId || !user) return false;

    const { error } = await supabase
      .from('room_mic_requests')
      .insert({
        room_id: roomId,
        user_id: user.id,
        requested_slot: slotNumber || null,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('لديك طلب قائم بالفعل');
      } else {
        console.error('Error requesting mic:', error);
        toast.error('فشل إرسال الطلب');
      }
      return false;
    }

    toast.success('تم إرسال طلب المايك');
    return true;
  };

  // Cancel mic request
  const cancelRequest = async () => {
    if (!myRequest) return false;

    const { error } = await supabase
      .from('room_mic_requests')
      .delete()
      .eq('id', myRequest.id);

    if (error) {
      toast.error('فشل إلغاء الطلب');
      return false;
    }

    setMyRequest(null);
    return true;
  };

  // Join mic slot directly (for approved requests or mod actions)
  const joinSlot = async (slotNumber: number) => {
    if (!roomId || !user) return false;

    // Check if slot is available
    const existingSlot = slots.find(s => s.slot_number === slotNumber);
    if (existingSlot) {
      toast.error('المايك مشغول');
      return false;
    }

    const { error } = await supabase
      .from('room_mic_slots')
      .insert({
        room_id: roomId,
        slot_number: slotNumber,
        user_id: user.id,
      });

    if (error) {
      console.error('Error joining mic:', error);
      toast.error('فشل الصعود على المايك');
      return false;
    }

    toast.success('تم الصعود على المايك');
    return true;
  };

  // Leave mic slot
  const leaveSlot = async () => {
    if (!mySlot) return false;

    const { error } = await supabase
      .from('room_mic_slots')
      .delete()
      .eq('id', mySlot.id);

    if (error) {
      toast.error('فشل النزول من المايك');
      return false;
    }

    setMySlot(null);
    toast.success('تم النزول من المايك');
    return true;
  };

  // Approve mic request (moderator action)
  const approveRequest = async (requestId: string, slotNumber: number) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return false;

    // First add to slot
    const { error: slotError } = await supabase
      .from('room_mic_slots')
      .insert({
        room_id: roomId!,
        slot_number: slotNumber,
        user_id: request.user_id,
      });

    if (slotError) {
      toast.error('المايك مشغول');
      return false;
    }

    // Then update request status
    await supabase
      .from('room_mic_requests')
      .update({ status: 'approved', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    toast.success('تم قبول الطلب');
    return true;
  };

  // Reject mic request
  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('room_mic_requests')
      .update({ status: 'rejected', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      toast.error('فشل رفض الطلب');
      return false;
    }

    toast.success('تم رفض الطلب');
    return true;
  };

  // Remove user from mic (moderator action)
  const removeFromMic = async (slotId: string) => {
    const { error } = await supabase
      .from('room_mic_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      toast.error('فشل إزالة المستخدم');
      return false;
    }

    toast.success('تم إزالة المستخدم من المايك');
    return true;
  };

  // Mute/unmute user on mic
  const toggleMuteMic = async (slotId: string, muted: boolean) => {
    const { error } = await supabase
      .from('room_mic_slots')
      .update({ is_muted: muted })
      .eq('id', slotId);

    if (error) {
      toast.error('فشل تغيير حالة الكتم');
      return false;
    }

    return true;
  };

  // Update room mic settings
  const updateSettings = async (newSettings: Partial<RoomMicSettings>) => {
    if (!roomId) return false;

    const { error } = await supabase
      .from('chat_rooms')
      .update(newSettings)
      .eq('id', roomId);

    if (error) {
      toast.error('فشل حفظ الإعدادات');
      return false;
    }

    setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    toast.success('تم حفظ الإعدادات');
    return true;
  };

  // Initial fetch
  useEffect(() => {
    if (!roomId) return;

    setLoading(true);
    Promise.all([fetchSettings(), fetchSlots(), fetchRequests()])
      .finally(() => setLoading(false));

    // Subscribe to realtime changes
    const slotsChannel = supabase
      .channel(`room_mic_slots_${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_mic_slots',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchSlots();
      })
      .subscribe();

    const requestsChannel = supabase
      .channel(`room_mic_requests_${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_mic_requests',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(slotsChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [roomId, fetchSettings, fetchSlots, fetchRequests]);

  return {
    slots,
    requests,
    settings,
    loading,
    mySlot,
    myRequest,
    requestMic,
    cancelRequest,
    joinSlot,
    leaveSlot,
    approveRequest,
    rejectRequest,
    removeFromMic,
    toggleMuteMic,
    updateSettings,
    refetch: () => {
      fetchSettings();
      fetchSlots();
      fetchRequests();
    },
  };
};

export default useRoomMics;
