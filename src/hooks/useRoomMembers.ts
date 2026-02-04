import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoomMemberWithProfile {
  user_id: string;
  role: string;
  is_muted: boolean;
  is_banned: boolean;
  last_seen_at: string;
  profile: {
    display_name: string;
    profile_picture: string | null;
    is_verified: boolean;
    is_vip: boolean;
    status: string;
  } | null;
  siteRole?: string;
  siteRoleLevel?: number;
}

export const useRoomMembers = (roomId: string | undefined) => {
  const [members, setMembers] = useState<RoomMemberWithProfile[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getRoleLevelNum = (role: string): number => {
    const levels: Record<string, number> = {
      owner: 6, super_owner: 6, super_admin: 5, admin: 4,
      moderator: 3, vip: 2, user: 1
    };
    return levels[role] || 1;
  };

  const fetchMembers = async () => {
    if (!roomId) return;

    try {
      const { data, error } = await supabase
        .from('chat_room_members')
        .select('user_id, role, is_muted, is_banned, last_seen_at')
        .eq('room_id', roomId)
        .eq('is_banned', false);

      if (error) throw error;

      // Fetch profiles and roles for each member
      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, profile_picture, is_verified, is_vip, status')
            .eq('user_id', member.user_id)
            .single();

          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', member.user_id);

          let maxRole = 'user';
          let maxLevel = 1;
          (roles || []).forEach((r: any) => {
            const roleLevel = getRoleLevelNum(r.role);
            if (roleLevel > maxLevel) {
              maxLevel = roleLevel;
              maxRole = r.role;
            }
          });

          return {
            ...member,
            profile,
            siteRole: maxRole,
            siteRoleLevel: maxLevel,
          };
        })
      );

      // Sort by role level (descending) - owners first
      membersWithProfiles.sort((a, b) => (b.siteRoleLevel || 0) - (a.siteRoleLevel || 0));
      
      setMembers(membersWithProfiles);
      setOnlineCount(membersWithProfiles.filter(m => m.profile?.status === 'online').length);
    } catch (error) {
      console.error('Error fetching room members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) {
      fetchMembers();

      // Subscribe to member changes
      const channel = supabase
        .channel(`room_members_${roomId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_room_members',
          filter: `room_id=eq.${roomId}`,
        }, () => {
          fetchMembers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [roomId]);

  return { members, onlineCount, loading, refetch: fetchMembers };
};

export default useRoomMembers;
