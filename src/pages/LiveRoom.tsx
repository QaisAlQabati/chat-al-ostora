import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import GiftModal from '@/components/gifts/GiftModal';
import MicInvitationModal from '@/components/live/MicInvitationModal';
import GuestSlots from '@/components/live/GuestSlots';
import PKBattleOverlay from '@/components/live/PKBattleOverlay';
import LiveSettingsModal from '@/components/live/LiveSettingsModal';
import ViewersList from '@/components/live/ViewersList';
import StartPKBattleModal from '@/components/live/StartPKBattleModal';
import { 
  X, Heart, Gift, Send, Users, Share2, 
  MoreVertical, Crown, BadgeCheck, Volume2, VolumeX,
  Mic, MicOff, Video, VideoOff, ChevronLeft, Star, UserPlus,
  Settings, Swords, Music, Gamepad2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface LiveOwner {
  user_id: string;
  username: string;
  display_name: string;
  profile_picture: string | null;
  is_verified: boolean;
  is_vip: boolean;
  level: number;
}

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  profile_picture: string | null;
  message: string;
  type: 'message' | 'gift' | 'join' | 'leave' | 'system';
  giftEmoji?: string;
  giftCount?: number;
  level?: number;
  timestamp: Date;
}

interface RoomMember {
  id: string;
  user_id: string;
  is_on_mic: boolean;
  mic_position: number | null;
  is_guest: boolean;
  is_muted_by_owner: boolean;
  camera_enabled: boolean;
  mic_enabled: boolean;
  is_moderator: boolean;
  profile?: {
    display_name: string;
    profile_picture: string | null;
    level: number;
    is_vip?: boolean;
    is_verified?: boolean;
  };
  stream?: MediaStream | null;
}

interface MicInvitation {
  id: string;
  room_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  mic_position: number | null;
  inviter?: {
    display_name: string;
    profile_picture: string | null;
  };
}

interface LiveSettings {
  max_mic_count: number;
  is_password_protected: boolean;
  allow_music: boolean;
  allow_games: boolean;
  allow_gifts: boolean;
  chat_enabled: boolean;
  background_url?: string;
}

interface PKBattle {
  id: string;
  room_id: string;
  battle_type: string;
  status: string;
  duration_seconds: number;
  started_at: string | null;
  team_a_users: string[];
  team_b_users: string[];
  team_a_points: number;
  team_b_points: number;
  winner_team: string | null;
}

const LiveRoom: React.FC = () => {
  const { liveId } = useParams();
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  // Core state
  const [liveOwner, setLiveOwner] = useState<LiveOwner | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [floatingLikes, setFloatingLikes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Media state
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Room members
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [guests, setGuests] = useState<RoomMember[]>([]);
  
  // Settings & Modals
  const [liveSettings, setLiveSettings] = useState<LiveSettings>({
    max_mic_count: 4,
    is_password_protected: false,
    allow_music: true,
    allow_games: true,
    allow_gifts: true,
    chat_enabled: true,
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPKModal, setShowPKModal] = useState(false);
  
  // Mic invitations
  const [pendingInvitation, setPendingInvitation] = useState<MicInvitation | null>(null);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  
  // PK Battle
  const [activeBattle, setActiveBattle] = useState<PKBattle | null>(null);
  const [teamAMembers, setTeamAMembers] = useState<any[]>([]);
  const [teamBMembers, setTeamBMembers] = useState<any[]>([]);
  
  // Refs
  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const isLiveOwner = liveId === user?.id;
  const isOnMic = roomMembers.some(m => m.user_id === user?.id && m.is_on_mic);
  const currentMember = roomMembers.find(m => m.user_id === user?.id);

  useEffect(() => {
    if (liveId) {
      fetchLiveData();
      fetchLiveSettings();
      joinLive();
      subscribeToChat();
      subscribeToMembers();
      subscribeToInvitations();
      subscribeToActiveBattle();
    }
    
    return () => {
      leaveLive();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [liveId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isLiveOwner && cameraEnabled) {
      startCamera();
    }
  }, [isLiveOwner]);

  // Subscriptions
  const subscribeToChat = () => {
    const channel = supabase
      .channel(`live-chat-${liveId}`)
      .on('broadcast', { event: 'chat' }, (payload) => {
        const msg = payload.payload as ChatMessage;
        setMessages(prev => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }]);
      })
      .on('broadcast', { event: 'pk_gift' }, (payload) => {
        // Handle PK battle gift points
        const { team, points } = payload.payload;
        setActiveBattle(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            team_a_points: team === 'A' ? prev.team_a_points + points : prev.team_a_points,
            team_b_points: team === 'B' ? prev.team_b_points + points : prev.team_b_points,
          };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToMembers = () => {
    const channel = supabase
      .channel(`live-members-${liveId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_room_members', filter: `room_id=eq.${liveId}` },
        () => {
          fetchRoomMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToInvitations = () => {
    if (!user) return;
    
    const channel = supabase
      .channel(`mic-invitations-${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'mic_invitations',
          filter: `invitee_id=eq.${user.id}`,
        },
        async (payload) => {
          const invitation = payload.new as MicInvitation;
          if (invitation.room_id === liveId && invitation.status === 'pending') {
            // Fetch inviter profile
            const { data: inviterProfile } = await supabase
              .from('profiles')
              .select('display_name, profile_picture')
              .eq('user_id', invitation.inviter_id)
              .single();
            
            setPendingInvitation({ ...invitation, inviter: inviterProfile });
            setShowInvitationModal(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToActiveBattle = () => {
    const channel = supabase
      .channel(`pk-battle-${liveId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'pk_battles',
          filter: `room_id=eq.${liveId}`,
        },
        () => {
          fetchActiveBattle();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Fetch functions
  const fetchLiveData = async () => {
    try {
      const { data: live, error } = await supabase
        .from('personal_lives')
        .select('*')
        .eq('user_id', liveId)
        .eq('is_live', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!live) {
        toast.error(lang === 'ar' ? 'البث غير متاح' : 'Live not available');
        navigate('/');
        return;
      }

      setLiveData(live);
      setViewerCount(live.viewer_count || 0);

      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, profile_picture, is_verified, is_vip, level')
        .eq('user_id', liveId)
        .single();

      if (ownerProfile) {
        setLiveOwner(ownerProfile);
      }

      if (profile) {
        const joinMsg: ChatMessage = {
          id: Date.now().toString(),
          user_id: user?.id || '',
          username: profile.username,
          display_name: profile.display_name,
          profile_picture: profile.profile_picture,
          message: lang === 'ar' ? 'انضم إلى البث' : 'joined the live',
          type: 'join',
          level: profile.level,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, joinMsg]);
        
        await supabase.channel(`live-chat-${liveId}`).send({
          type: 'broadcast',
          event: 'chat',
          payload: joinMsg,
        });
      }

      fetchRoomMembers();
      fetchActiveBattle();
    } catch (error) {
      console.error('Error fetching live:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveSettings = async () => {
    if (!liveId) return;
    
    try {
      const { data, error } = await supabase
        .from('live_settings')
        .select('*')
        .eq('user_id', liveId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setLiveSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchRoomMembers = async () => {
    if (!liveId) return;
    
    try {
      const { data, error } = await supabase
        .from('live_room_members')
        .select('*')
        .eq('room_id', liveId);

      if (error) throw error;

      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, profile_picture, level, is_vip, is_verified')
            .eq('user_id', member.user_id)
            .single();
          return { ...member, profile: profileData };
        })
      );

      setRoomMembers(membersWithProfiles);
      setGuests(membersWithProfiles.filter(m => m.is_on_mic && m.mic_position));
      setViewerCount(membersWithProfiles.length);
    } catch (error) {
      console.error('Error fetching room members:', error);
    }
  };

  const fetchActiveBattle = async () => {
    if (!liveId) return;
    
    try {
      const { data, error } = await supabase
        .from('pk_battles')
        .select('*')
        .eq('room_id', liveId)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setActiveBattle(data);
        
        // Fetch team member profiles
        const teamAProfiles = await Promise.all(
          (data.team_a_users || []).map(async (userId: string) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, profile_picture')
              .eq('user_id', userId)
              .single();
            return { user_id: userId, ...profile };
          })
        );
        
        const teamBProfiles = await Promise.all(
          (data.team_b_users || []).map(async (userId: string) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, profile_picture')
              .eq('user_id', userId)
              .single();
            return { user_id: userId, ...profile };
          })
        );
        
        setTeamAMembers(teamAProfiles);
        setTeamBMembers(teamBProfiles);
      } else {
        setActiveBattle(null);
      }
    } catch (error) {
      console.error('Error fetching battle:', error);
    }
  };

  // Camera/Mic functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: micEnabled,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error(lang === 'ar' ? 'فشل تشغيل الكاميرا' : 'Failed to start camera');
    }
  };

  const toggleMic = async () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => track.enabled = !track.enabled);
        setMicEnabled(!micEnabled);
      } else {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
          setMicEnabled(true);
        } catch (error) {
          console.error('Error adding audio:', error);
        }
      }
      
      // Update member status
      if (user) {
        await supabase
          .from('live_room_members')
          .update({ mic_enabled: !micEnabled })
          .eq('room_id', liveId)
          .eq('user_id', user.id);
      }
    }
  };

  const toggleCamera = async () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setCameraEnabled(!cameraEnabled);
      
      if (user) {
        await supabase
          .from('live_room_members')
          .update({ camera_enabled: !cameraEnabled })
          .eq('room_id', liveId)
          .eq('user_id', user.id);
      }
    }
  };

  // Room actions
  const joinLive = async () => {
    if (!user || !liveId) return;
    
    try {
      await supabase
        .from('live_room_members')
        .upsert({
          room_id: liveId,
          user_id: user.id,
          is_on_mic: false,
          is_guest: false,
        });

      await supabase
        .from('personal_lives')
        .update({ viewer_count: viewerCount + 1 })
        .eq('user_id', liveId);
    } catch (error) {
      console.error('Error joining live:', error);
    }
  };

  const leaveLive = async () => {
    if (!user || !liveId) return;
    
    try {
      await supabase
        .from('live_room_members')
        .delete()
        .eq('room_id', liveId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error leaving live:', error);
    }
  };

  const endLive = async () => {
    if (!user) return;
    
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      await supabase
        .from('personal_lives')
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      toast.success(lang === 'ar' ? 'انتهى البث!' : 'Live ended!');
      navigate('/');
    } catch (error) {
      console.error('Error ending live:', error);
    }
  };

  // Chat actions
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile || !liveSettings.chat_enabled) return;
    
    const msg: ChatMessage = {
      id: Date.now().toString(),
      user_id: user?.id || '',
      username: profile.username,
      display_name: profile.display_name,
      profile_picture: profile.profile_picture,
      message: newMessage,
      type: 'message',
      level: profile.level,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, msg]);
    setNewMessage('');

    await supabase.channel(`live-chat-${liveId}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    });
  };

  const handleLike = () => {
    setLiked(true);
    setFloatingLikes(prev => [...prev, Date.now()]);
    setTimeout(() => setLiked(false), 300);
    setTimeout(() => setFloatingLikes(prev => prev.slice(1)), 2000);
  };

  const handleGiftSent = async (giftEmoji: string, quantity: number) => {
    if (!profile) return;
    
    const msg: ChatMessage = {
      id: Date.now().toString(),
      user_id: user?.id || '',
      username: profile.username,
      display_name: profile.display_name,
      profile_picture: profile.profile_picture,
      message: lang === 'ar' ? `أرسل ${quantity} هدية` : `sent ${quantity} gift`,
      type: 'gift',
      giftEmoji,
      giftCount: quantity,
      level: profile.level,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, msg]);

    await supabase.channel(`live-chat-${liveId}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    });

    // If PK battle is active, add points to the receiver's team
    if (activeBattle?.status === 'active' && liveOwner) {
      const isTeamA = activeBattle.team_a_users.includes(liveOwner.user_id);
      const isTeamB = activeBattle.team_b_users.includes(liveOwner.user_id);
      
      if (isTeamA || isTeamB) {
        await supabase.channel(`live-chat-${liveId}`).send({
          type: 'broadcast',
          event: 'pk_gift',
          payload: { team: isTeamA ? 'A' : 'B', points: quantity },
        });
      }
    }
  };

  // Guest/Mic management
  const inviteToMic = async (userId: string, position: number) => {
    if (!user || !liveId) return;
    
    try {
      await supabase
        .from('mic_invitations')
        .insert({
          room_id: liveId,
          inviter_id: user.id,
          invitee_id: userId,
          mic_position: position,
        });
      
      toast.success(lang === 'ar' ? 'تم إرسال الدعوة' : 'Invitation sent');
    } catch (error) {
      console.error('Error inviting to mic:', error);
      toast.error(lang === 'ar' ? 'فشل إرسال الدعوة' : 'Failed to send invitation');
    }
  };

  const handleAcceptInvitation = async () => {
    if (!pendingInvitation || !user) return;
    
    try {
      // Start camera/mic for guest
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);
      
      // Update member status
      await supabase
        .from('live_room_members')
        .update({
          is_on_mic: true,
          is_guest: true,
          mic_position: pendingInvitation.mic_position,
          mic_enabled: true,
          camera_enabled: true,
        })
        .eq('room_id', liveId)
        .eq('user_id', user.id);
      
      setMicEnabled(true);
      setCameraEnabled(true);
      
      // Broadcast join message
      const msg: ChatMessage = {
        id: Date.now().toString(),
        user_id: user.id,
        username: profile?.username || '',
        display_name: profile?.display_name || '',
        profile_picture: profile?.profile_picture || null,
        message: lang === 'ar' ? 'انضم إلى المايك' : 'joined the mic',
        type: 'system',
        level: profile?.level,
        timestamp: new Date(),
      };
      
      await supabase.channel(`live-chat-${liveId}`).send({
        type: 'broadcast',
        event: 'chat',
        payload: msg,
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(lang === 'ar' ? 'فشل الانضمام للمايك' : 'Failed to join mic');
    }
  };

  const handleRejectInvitation = () => {
    setPendingInvitation(null);
  };

  const removeFromMic = async (userId: string) => {
    try {
      await supabase
        .from('live_room_members')
        .update({
          is_on_mic: false,
          is_guest: false,
          mic_position: null,
          mic_enabled: false,
          camera_enabled: false,
        })
        .eq('room_id', liveId)
        .eq('user_id', userId);
      
      toast.success(lang === 'ar' ? 'تم إنزاله من المايك' : 'Removed from mic');
    } catch (error) {
      console.error('Error removing from mic:', error);
    }
  };

  const toggleGuestMic = async (userId: string) => {
    const guest = guests.find(g => g.user_id === userId);
    if (!guest) return;
    
    if (isLiveOwner) {
      await supabase
        .from('live_room_members')
        .update({ is_muted_by_owner: !guest.is_muted_by_owner })
        .eq('room_id', liveId)
        .eq('user_id', userId);
    } else if (userId === user?.id) {
      await supabase
        .from('live_room_members')
        .update({ mic_enabled: !guest.mic_enabled })
        .eq('room_id', liveId)
        .eq('user_id', userId);
      setMicEnabled(!guest.mic_enabled);
    }
  };

  const toggleGuestCamera = async (userId: string) => {
    if (userId !== user?.id) return;
    
    const guest = guests.find(g => g.user_id === userId);
    if (!guest) return;
    
    await supabase
      .from('live_room_members')
      .update({ camera_enabled: !guest.camera_enabled })
      .eq('room_id', liveId)
      .eq('user_id', userId);
    
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = !guest.camera_enabled);
    }
    setCameraEnabled(!guest.camera_enabled);
  };

  const makeModerator = async (userId: string) => {
    const member = roomMembers.find(m => m.user_id === userId);
    if (!member) return;
    
    await supabase
      .from('live_room_members')
      .update({ is_moderator: !member.is_moderator })
      .eq('room_id', liveId)
      .eq('user_id', userId);
    
    toast.success(
      member.is_moderator
        ? (lang === 'ar' ? 'تم إزالة الإشراف' : 'Moderator removed')
        : (lang === 'ar' ? 'تم تعيين مشرف' : 'Moderator assigned')
    );
  };

  const kickUser = async (userId: string) => {
    await supabase
      .from('live_room_members')
      .delete()
      .eq('room_id', liveId)
      .eq('user_id', userId);
    
    toast.success(lang === 'ar' ? 'تم طرد المستخدم' : 'User kicked');
  };

  // PK Battle actions
  const startPKBattle = async (config: any) => {
    if (!user || !liveId) return;
    
    try {
      const { error } = await supabase
        .from('pk_battles')
        .insert({
          room_id: liveId,
          battle_type: config.battleType,
          duration_seconds: config.duration,
          team_a_users: config.teamA,
          team_b_users: config.teamB,
          status: 'active',
          started_at: new Date().toISOString(),
          created_by: user.id,
        });

      if (error) throw error;
      
      toast.success(lang === 'ar' ? 'بدأت المواجهة!' : 'Battle started!');
      
      // Broadcast system message
      const msg: ChatMessage = {
        id: Date.now().toString(),
        user_id: 'system',
        username: 'system',
        display_name: 'System',
        profile_picture: null,
        message: lang === 'ar' ? '🎮 بدأت لعبة الأحكام!' : '🎮 PK Battle started!',
        type: 'system',
        timestamp: new Date(),
      };
      
      await supabase.channel(`live-chat-${liveId}`).send({
        type: 'broadcast',
        event: 'chat',
        payload: msg,
      });
    } catch (error) {
      console.error('Error starting battle:', error);
      toast.error(lang === 'ar' ? 'فشل بدء المواجهة' : 'Failed to start battle');
    }
  };

  const endPKBattle = async (winner: string) => {
    if (!activeBattle) return;
    
    try {
      await supabase
        .from('pk_battles')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          winner_team: winner,
        })
        .eq('id', activeBattle.id);
      
      const winnerText = winner === 'draw'
        ? (lang === 'ar' ? 'تعادل!' : 'Draw!')
        : (lang === 'ar' ? `فاز الفريق ${winner === 'A' ? 'أ' : 'ب'}!` : `Team ${winner} wins!`);
      
      const msg: ChatMessage = {
        id: Date.now().toString(),
        user_id: 'system',
        username: 'system',
        display_name: 'System',
        profile_picture: null,
        message: `🏆 ${winnerText}`,
        type: 'system',
        timestamp: new Date(),
      };
      
      await supabase.channel(`live-chat-${liveId}`).send({
        type: 'broadcast',
        event: 'chat',
        payload: msg,
      });
    } catch (error) {
      console.error('Error ending battle:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Video Background */}
      <div className="absolute inset-0">
        {isLiveOwner && stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : liveSettings.background_url ? (
          <img
            src={liveSettings.background_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : liveOwner?.profile_picture ? (
          <img
            src={liveOwner.profile_picture}
            alt=""
            className="w-full h-full object-cover blur-sm"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-red-900">
            <span className="text-8xl font-bold text-white/30">
              {liveOwner?.display_name?.[0] || 'L'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
      </div>

      {/* PK Battle Overlay */}
      {activeBattle && activeBattle.status !== 'ended' && (
        <PKBattleOverlay
          battle={activeBattle}
          teamAMembers={teamAMembers}
          teamBMembers={teamBMembers}
          onBattleEnd={endPKBattle}
        />
      )}

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          {/* Streamer Info */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full pr-3 pl-1 py-1">
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-pink-500">
              {liveOwner?.profile_picture ? (
                <img src={liveOwner.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold text-sm">
                  {liveOwner?.display_name?.[0]}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-white font-semibold text-sm">
                  {liveOwner?.display_name}
                </span>
                {liveOwner?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                {liveOwner?.is_vip && <Crown className="w-3 h-3 text-yellow-400" />}
              </div>
              <span className="text-xs text-yellow-400">⭐ Lv.{liveOwner?.level}</span>
            </div>
            {!isLiveOwner && (
              <Button
                size="sm"
                className="h-6 px-2 bg-pink-500 hover:bg-pink-600 text-white text-xs rounded-full ml-1"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                {lang === 'ar' ? 'متابعة' : 'Follow'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewers List */}
          <ViewersList
            viewers={roomMembers}
            isOwner={isLiveOwner}
            currentUserId={user?.id}
            onInviteToMic={(userId) => {
              const freePosition = Array.from({ length: liveSettings.max_mic_count }, (_, i) => i + 1)
                .find(pos => !guests.some(g => g.mic_position === pos));
              if (freePosition) inviteToMic(userId, freePosition);
            }}
            onMakeModerator={makeModerator}
            onKickUser={kickUser}
            onMuteUser={(userId) => toggleGuestMic(userId)}
          />
          
          {/* Live Badge */}
          <div className="px-2.5 py-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE</span>
          </div>
          
          {/* Settings/End/Close */}
          {isLiveOwner ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowSettingsModal(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  {lang === 'ar' ? 'الإعدادات' : 'Settings'}
                </DropdownMenuItem>
                {liveSettings.allow_games && (
                  <DropdownMenuItem onClick={() => setShowPKModal(true)}>
                    <Swords className="w-4 h-4 mr-2" />
                    {lang === 'ar' ? 'لعبة الأحكام' : 'PK Battle'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={endLive} className="text-destructive">
                  <X className="w-4 h-4 mr-2" />
                  {lang === 'ar' ? 'إنهاء البث' : 'End Live'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Guest Slots */}
      {guests.length > 0 || isLiveOwner ? (
        <div className="relative z-10 px-4 mt-2">
          <GuestSlots
            guests={guests.map(g => ({ ...g, stream: g.user_id === user?.id ? stream : null }))}
            maxSlots={liveSettings.max_mic_count}
            isOwner={isLiveOwner}
            currentUserId={user?.id}
            onInviteGuest={(position) => {
              // Open viewers list to invite
              toast.info(lang === 'ar' ? 'اختر شخصاً للدعوة من قائمة المشاهدين' : 'Select someone to invite from viewers list');
            }}
            onRemoveGuest={removeFromMic}
            onToggleGuestMic={toggleGuestMic}
            onToggleGuestCamera={toggleGuestCamera}
            layout={activeBattle?.status === 'active' ? 'pk' : 'horizontal'}
          />
        </div>
      ) : null}

      {/* Owner/Guest Controls */}
      {(isLiveOwner || isOnMic) && (
        <div className="relative z-10 flex justify-center gap-3 mt-4 px-4">
          <Button
            variant={micEnabled ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleMic}
            className="w-11 h-11 rounded-full"
          >
            {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          <Button
            variant={cameraEnabled ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleCamera}
            className="w-11 h-11 rounded-full"
          >
            {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          {isOnMic && !isLiveOwner && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => removeFromMic(user?.id || '')}
              className="w-11 h-11 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}

      {/* Chat Section - Bottom Half */}
      <div className="relative z-10 flex-1 flex flex-col justify-end">
        {/* Messages */}
        {liveSettings.chat_enabled && (
          <ScrollArea className="flex-1 max-h-[40vh] px-3" ref={chatRef}>
            <div className="space-y-2 pb-2">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-slide-up">
                  {msg.type === 'gift' ? (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/40 to-pink-500/40 backdrop-blur-sm rounded-full px-3 py-1.5 inline-flex">
                      <span className="text-2xl">{msg.giftEmoji}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-300 font-bold text-sm">{msg.display_name}</span>
                        <span className="text-white text-sm">{msg.message}</span>
                        <span className="text-yellow-300 text-lg font-bold">×{msg.giftCount}</span>
                      </div>
                    </div>
                  ) : msg.type === 'join' || msg.type === 'leave' ? (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-purple-500">
                        {msg.profile_picture ? (
                          <img src={msg.profile_picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                            {msg.display_name[0]}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-pink-300">{msg.display_name}</span>
                      <span>{msg.message}</span>
                    </div>
                  ) : msg.type === 'system' ? (
                    <div className="text-center py-1">
                      <span className="bg-black/50 text-white/80 text-xs px-3 py-1 rounded-full">
                        {msg.message}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                        {msg.profile_picture ? (
                          <img src={msg.profile_picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500 text-white text-xs font-bold">
                            {msg.display_name[0]}
                          </div>
                        )}
                      </div>
                      <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-3 py-1.5 max-w-[80%]">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold">
                            {msg.level}
                          </span>
                          <span className="text-pink-300 font-medium text-sm">{msg.display_name}</span>
                        </div>
                        <p className="text-white text-sm mt-0.5">{msg.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Bottom Actions */}
        <div className="p-3 flex items-center gap-2">
          {/* Chat Input */}
          {liveSettings.chat_enabled && (
            <div className="flex-1 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={lang === 'ar' ? 'إضافة تعليق...' : 'Add a comment...'}
                className="flex-1 bg-transparent border-0 text-white placeholder:text-white/50 focus-visible:ring-0 p-0 h-auto text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSendMessage}
                className="text-white hover:text-pink-400 h-7 w-7"
                disabled={!newMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Gift Button */}
            {liveSettings.allow_gifts && (
              <Button
                onClick={() => setShowGiftModal(true)}
                className="w-11 h-11 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg"
              >
                <Gift className="w-5 h-5" />
              </Button>
            )}

            {/* Like Button */}
            <div className="relative">
              <Button
                onClick={handleLike}
                variant="ghost"
                className={cn(
                  "w-11 h-11 rounded-full bg-black/50 text-white",
                  liked && "scale-110"
                )}
              >
                <Heart className={cn("w-5 h-5 transition-all", liked && "fill-red-500 text-red-500")} />
              </Button>
              
              {/* Floating Likes */}
              {floatingLikes.map((id, i) => (
                <Heart
                  key={id}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 text-red-500 fill-red-500 w-6 h-6 animate-float pointer-events-none"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    left: `${50 + (Math.random() - 0.5) * 40}%`,
                  }}
                />
              ))}
            </div>

            {/* Share Button */}
            <Button
              variant="ghost"
              className="w-11 h-11 rounded-full bg-black/50 text-white"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active Members on Side */}
      {roomMembers.length > 0 && !activeBattle && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 space-y-2">
          {roomMembers.filter(m => !m.is_on_mic).slice(0, 5).map((member) => (
            <div
              key={member.id}
              className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-pink-500/50 cursor-pointer hover:ring-pink-500 transition-all"
              onClick={() => navigate(`/profile/${member.user_id}`)}
            >
              {member.profile?.profile_picture ? (
                <img src={member.profile.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold text-xs">
                  {member.profile?.display_name?.[0] || '?'}
                </div>
              )}
            </div>
          ))}
          {roomMembers.filter(m => !m.is_on_mic).length > 5 && (
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white text-xs font-bold">
              +{roomMembers.filter(m => !m.is_on_mic).length - 5}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {liveOwner && (
        <GiftModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          receiverId={liveOwner.user_id}
          receiverName={liveOwner.display_name}
          context="live"
          liveId={liveId}
          onGiftSent={handleGiftSent}
        />
      )}

      <MicInvitationModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        invitation={pendingInvitation}
        onAccept={handleAcceptInvitation}
        onReject={handleRejectInvitation}
      />

      <LiveSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={(settings) => setLiveSettings(settings)}
      />

      <StartPKBattleModal
        isOpen={showPKModal}
        onClose={() => setShowPKModal(false)}
        onStart={startPKBattle}
        availableGuests={guests.map(g => ({
          user_id: g.user_id,
          display_name: g.profile?.display_name || '',
          profile_picture: g.profile?.profile_picture || null,
        }))}
      />
    </div>
  );
};

export default LiveRoom;
