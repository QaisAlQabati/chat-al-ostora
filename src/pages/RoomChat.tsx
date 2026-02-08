import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoomMics } from '@/hooks/useRoomMics';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, Send, Settings, Users, UserPlus, Home,
  MoreVertical, Trash2, Pin, Youtube, Smile, Image, Mic, Layers,
  Hand, Lock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import RoomSettingsModal from '@/components/rooms/RoomSettingsModal';
import MicSlotsDisplay from '@/components/rooms/MicSlotsDisplay';
import MicSettingsModal from '@/components/rooms/MicSettingsModal';
import MicRequestsModal from '@/components/rooms/MicRequestsModal';
import ChatMessage from '@/components/chat/ChatMessage';
import OnlineUsersSidebar from '@/components/chat/OnlineUsersSidebar';
import YouTubePlayer from '@/components/chat/YouTubePlayer';
import UserProfileModal from '@/components/profile/UserProfileModal';
import RoomSwitcher from '@/components/rooms/RoomSwitcher';
import JailedScreen from '@/components/common/JailedScreen';

interface Message {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_id: string;
  sender?: {
    display_name: string;
    profile_picture: string | null;
    is_verified: boolean;
    is_vip: boolean;
    vip_type: string | null;
  };
  senderRole?: string;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  background_url: string | null;
  background_color: string;
  welcome_message: string | null;
  pinned_message: string | null;
  created_by: string;
  is_pinned: boolean;
}

interface Member {
  user_id: string;
  role: string;
  is_muted: boolean;
  is_banned: boolean;
}

const MESSAGES_PER_PAGE = 30;

const RoomChat: React.FC = () => {
  const { roomId } = useParams();
  const { lang } = useLanguage();
  const { user, profile, isOwner: isAppOwner } = useAuth();
  const { maxRoleLevel, permissions } = useUserRole();
  const navigate = useNavigate();

  // Check if user is jailed
  const isJailed = profile?.jailed_in_room !== null && profile?.jailed_in_room !== undefined;
  const jailedRoomId = profile?.jailed_in_room;

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [myMembership, setMyMembership] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [memberCount, setMemberCount] = useState(0);
  const [showMicSettings, setShowMicSettings] = useState(false);
  const [showMicRequests, setShowMicRequests] = useState(false);

  // Room Mics Hook
  const {
    slots: micSlots,
    requests: micRequests,
    settings: micSettings,
    mySlot,
    myRequest,
    requestMic,
    cancelRequest,
    leaveSlot,
    approveRequest,
    rejectRequest,
    removeFromMic,
    toggleMuteMic,
    updateSettings: updateMicSettings,
  } = useRoomMics(roomId);

  const isModOrOwner = isAppOwner || maxRoleLevel >= 3;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const oldestMessageId = useRef<string | null>(null);

  // Role level helper
  const getRoleLevelNum = (role: string): number => {
    const levels: Record<string, number> = {
      owner: 6, super_owner: 6, super_admin: 5, admin: 4,
      moderator: 3, vip: 2, user: 1
    };
    return levels[role] || 1;
  };

  // Fetch sender info helper
  const fetchSenderInfo = async (senderId: string) => {
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name, profile_picture, is_verified, is_vip, vip_type')
      .eq('user_id', senderId)
      .single();

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', senderId);

    let maxRole = 'user';
    let maxLevel = 1;
    (roles || []).forEach((r: any) => {
      const roleLevel = getRoleLevelNum(r.role);
      if (roleLevel > maxLevel) {
        maxLevel = roleLevel;
        maxRole = r.role;
      }
    });

    return { sender, senderRole: maxRole };
  };

  useEffect(() => {
    if (!user || !roomId) {
      navigate('/rooms');
      return;
    }

    // If user is jailed and trying to access a different room, redirect to jail room
    if (isJailed && jailedRoomId && roomId !== jailedRoomId) {
      toast.error(lang === 'ar' ? 'أنت محبوس ولا يمكنك التنقل' : 'You are jailed and cannot navigate');
      navigate(`/rooms/${jailedRoomId}`);
      return;
    }

    fetchRoom();
    fetchLatestMessages();
    fetchMyMembership();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room_${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_room_messages',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const newMsg = payload.new as Message;
        const { sender, senderRole } = await fetchSenderInfo(newMsg.sender_id);
        setMessages(prev => [...prev, { ...newMsg, sender, senderRole }]);
      })
      .subscribe();

    // Subscribe to member changes for live count
    const memberChannel = supabase
      .channel(`room_members_${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_room_members',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchMemberCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(memberChannel);
    };
  }, [user, roomId]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (messages.length > 0 && !loadingMore) {
      // Use instant scroll on initial load, smooth on new messages
      const isInitialLoad = oldestMessageId.current === messages[0]?.id;
      messagesEndRef.current?.scrollIntoView({ 
        behavior: isInitialLoad ? 'instant' : 'smooth' 
      });
    }
  }, [messages, loadingMore]);

  const fetchMemberCount = async () => {
    if (!roomId) return;
    const { count } = await supabase
      .from('chat_room_members')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('is_banned', false);
    setMemberCount(count || 0);
  };

  const fetchRoom = async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) {
      console.error('Error fetching room:', error);
      navigate('/rooms');
      return;
    }

    setRoom(data);
    await fetchMemberCount();
    setLoading(false);
  };

  // Smart message loading - load latest first
  const fetchLatestMessages = async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from('chat_room_messages')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Reverse to show oldest first, but we loaded newest first
    const reversedData = (data || []).reverse();
    
    if (reversedData.length > 0) {
      oldestMessageId.current = reversedData[0].id;
    }
    setHasMoreMessages((data || []).length === MESSAGES_PER_PAGE);

    // Fetch sender info for each message
    const messagesWithSenders = await Promise.all(
      reversedData.map(async (msg) => {
        const { sender, senderRole } = await fetchSenderInfo(msg.sender_id);
        return { ...msg, sender, senderRole };
      })
    );

    setMessages(messagesWithSenders);
  };

  // Load older messages when scrolling up
  const loadMoreMessages = useCallback(async () => {
    if (!roomId || loadingMore || !hasMoreMessages || messages.length === 0) return;

    setLoadingMore(true);
    const firstMessage = messages[0];

    const { data, error } = await supabase
      .from('chat_room_messages')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .lt('created_at', firstMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PER_PAGE);

    if (error) {
      console.error('Error loading more messages:', error);
      setLoadingMore(false);
      return;
    }

    if ((data || []).length < MESSAGES_PER_PAGE) {
      setHasMoreMessages(false);
    }

    const reversedData = (data || []).reverse();
    const messagesWithSenders = await Promise.all(
      reversedData.map(async (msg) => {
        const { sender, senderRole } = await fetchSenderInfo(msg.sender_id);
        return { ...msg, sender, senderRole };
      })
    );

    setMessages(prev => [...messagesWithSenders, ...prev]);
    setLoadingMore(false);
  }, [roomId, loadingMore, hasMoreMessages, messages]);

  // Handle scroll to load more
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop < 100 && hasMoreMessages && !loadingMore) {
      loadMoreMessages();
    }
  }, [loadMoreMessages, hasMoreMessages, loadingMore]);

  const fetchMessages = async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from('chat_room_messages')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Fetch sender info and roles for each message
    const messagesWithSenders = await Promise.all(
      (data || []).map(async (msg) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('display_name, profile_picture, is_verified, is_vip, vip_type')
          .eq('user_id', msg.sender_id)
          .single();

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', msg.sender_id);

        let maxRole = 'user';
        let maxLevel = 1;
        (roles || []).forEach((r: any) => {
          const roleLevel = getRoleLevelNum(r.role);
          if (roleLevel > maxLevel) {
            maxLevel = roleLevel;
            maxRole = r.role;
          }
        });

        return { ...msg, sender, senderRole: maxRole };
      })
    );

    setMessages(messagesWithSenders);
  };

  const fetchMyMembership = async () => {
    if (!roomId || !user) return;

    const { data } = await supabase
      .from('chat_room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    setMyMembership(data);

    if (data?.is_banned) {
      toast.error(lang === 'ar' ? 'أنت محظور من هذه الغرفة' : 'You are banned from this room');
      navigate('/rooms');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !roomId || !user || myMembership?.is_muted) return;

    const { error } = await supabase
      .from('chat_room_messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content: newMessage.trim(),
        message_type: 'text',
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message');
      return;
    }

    setNewMessage('');
  };

  const handleMention = (name: string) => {
    setNewMessage(prev => prev + `@[${name}] `);
    inputRef.current?.focus();
  };

  const handleOpenProfile = (userId: string) => {
    setSelectedUserId(userId);
    setShowProfileModal(true);
  };

  const handleYouTubeSelect = async (video: any) => {
    // Send YouTube video as message
    await supabase
      .from('chat_room_messages')
      .insert({
        room_id: roomId,
        sender_id: user?.id,
        content: `🎬 ${video.title}\nhttps://youtube.com/watch?v=${video.id}`,
        message_type: 'youtube',
      });
  };

  const clearChat = async () => {
    if (!roomId || !isAppOwner) return;

    const { error } = await supabase
      .from('chat_room_messages')
      .update({ is_deleted: true, deleted_by: user?.id })
      .eq('room_id', roomId);

    if (error) {
      toast.error(lang === 'ar' ? 'فشل مسح الدردشة' : 'Failed to clear chat');
      return;
    }

    setMessages([]);
    toast.success(lang === 'ar' ? 'تم مسح الدردشة' : 'Chat cleared');
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Fixed Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: room.background_color || '#1a1a2e',
          backgroundImage: room.background_url ? `url(${room.background_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      />
      
      {/* Content overlay */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 glass-dark border-b border-border/30">
          <div className="flex items-center gap-2 p-3">
            {/* Back button */}
            <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            {/* Room icon/image */}
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl overflow-hidden">
              {room.background_url ? (
                <img src={room.background_url} alt="" className="w-full h-full object-cover" />
              ) : (
                room.icon
              )}
            </div>
            
            {/* Room info */}
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold truncate text-sm">{room.name}</h1>
              <p className="text-xs text-muted-foreground">
                {memberCount} {lang === 'ar' ? 'متصل' : 'online'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Room Switcher */}
              <RoomSwitcher currentRoomId={roomId}>
                <Button variant="ghost" size="icon">
                  <Layers className="w-5 h-5" />
                </Button>
              </RoomSwitcher>

              {/* Home */}
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <Home className="w-5 h-5" />
              </Button>

              {/* Friends */}
              <Button variant="ghost" size="icon">
                <UserPlus className="w-5 h-5" />
              </Button>

              {/* Online Users */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowOnlineUsers(true)}
                className="relative"
              >
                <Users className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center font-bold">
                  {memberCount}
                </span>
              </Button>

              {/* Mic Requests Button for Mods */}
              {isModOrOwner && micRequests.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMicRequests(true)}
                  className="relative"
                >
                  <Hand className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center font-bold">
                    {micRequests.length}
                  </span>
                </Button>
              )}

              {/* Settings dropdown */}
              {isAppOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowSettings(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      {lang === 'ar' ? 'إعدادات الغرفة' : 'Room Settings'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowMicSettings(true)}>
                      <Mic className="w-4 h-4 mr-2" />
                      {lang === 'ar' ? 'إعدادات المايكات' : 'Mic Settings'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={clearChat} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {lang === 'ar' ? 'مسح الدردشة' : 'Clear Chat'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Pinned Message */}
          {room.pinned_message && (
            <div className="px-3 pb-2">
              <div className="bg-primary/10 rounded-lg p-2 flex items-start gap-2">
                <Pin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm">{room.pinned_message}</p>
              </div>
            </div>
          )}
        </header>

        {/* Mic Slots Display */}
        {micSettings?.mic_enabled && (
          <MicSlotsDisplay
            slots={micSlots}
            settings={micSettings}
            maxSlots={micSettings.mic_count}
            isModOrOwner={isModOrOwner}
            mySlot={mySlot}
            hasMyRequest={!!myRequest}
            onRequestMic={requestMic}
            onCancelRequest={cancelRequest}
            onLeaveSlot={leaveSlot}
            onRemoveFromMic={removeFromMic}
            onToggleMute={toggleMuteMic}
          />
        )}

        {/* Messages Area with scroll handler */}
        <ScrollArea 
          className="flex-1 px-2" 
          ref={scrollAreaRef}
          onScrollCapture={handleScroll}
        >
          <div className="py-3 space-y-1">
            {/* Loading indicator for older messages */}
            {loadingMore && (
              <div className="text-center py-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}

            {/* Load more button */}
            {hasMoreMessages && !loadingMore && messages.length > 0 && (
              <div className="text-center py-2">
                <Button variant="ghost" size="sm" onClick={loadMoreMessages}>
                  {lang === 'ar' ? 'تحميل المزيد' : 'Load more'}
                </Button>
              </div>
            )}

            {/* Welcome Message */}
            {room.welcome_message && messages.length === 0 && (
              <div className="text-center py-4">
                <p className="inline-block px-4 py-2 rounded-full bg-primary/10 text-sm">
                  {room.welcome_message}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onMention={handleMention}
                onOpenProfile={handleOpenProfile}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="sticky bottom-0 z-40 glass-dark border-t border-border/30 p-3">
          {myMembership?.is_muted ? (
            <div className="text-center text-muted-foreground py-2">
              <p className="text-sm">
                {lang === 'ar' ? 'أنت مكتوم في هذه الغرفة' : 'You are muted in this room'}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Attachment button */}
              {permissions.canSendMedia && (
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Image className="w-5 h-5" />
                </Button>
              )}

              {/* Voice button */}
              {permissions.canSendMedia && (
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Mic className="w-5 h-5" />
                </Button>
              )}

              {/* YouTube button - VIP and above */}
              {maxRoleLevel >= 2 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="flex-shrink-0"
                  onClick={() => setShowYouTube(true)}
                >
                  <Youtube className="w-5 h-5 text-red-500" />
                </Button>
              )}

              {/* Text Input */}
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={lang === 'ar' ? 'اكتب هنا...' : 'Type here...'}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="pr-10 bg-muted/50"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                  <Smile className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>

              {/* Send Button */}
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="gradient-primary flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Online Users Sidebar */}
      <OnlineUsersSidebar
        isOpen={showOnlineUsers}
        onClose={() => setShowOnlineUsers(false)}
        roomId={room.id}
        onMention={handleMention}
        onOpenProfile={handleOpenProfile}
      />

      {/* YouTube Player */}
      <YouTubePlayer
        isOpen={showYouTube}
        onClose={() => setShowYouTube(false)}
        onSelectVideo={handleYouTubeSelect}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userId={selectedUserId}
        currentUserRole={maxRoleLevel}
        isAppOwner={isAppOwner}
      />

      {/* Room Settings Modal */}
      <RoomSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        room={room}
        onUpdate={fetchRoom}
      />

      {/* Mic Settings Modal */}
      <MicSettingsModal
        isOpen={showMicSettings}
        onClose={() => setShowMicSettings(false)}
        roomName={room.name}
        settings={micSettings}
        onSave={updateMicSettings}
      />

      {/* Mic Requests Modal */}
      <MicRequestsModal
        isOpen={showMicRequests}
        onClose={() => setShowMicRequests(false)}
        requests={micRequests}
        slots={micSlots}
        maxSlots={micSettings?.mic_count || 4}
        onApprove={approveRequest}
        onReject={rejectRequest}
      />

      {/* CSS for slide-in animation */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default RoomChat;
