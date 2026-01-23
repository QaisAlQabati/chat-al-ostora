import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, Send, Settings, Users, Crown, 
  Star, MoreVertical, Trash2, UserX, Shield,
  Volume2, VolumeX, MessageSquare, Pin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import RoomSettingsModal from '@/components/rooms/RoomSettingsModal';
import RoomMembersModal from '@/components/rooms/RoomMembersModal';

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
}

interface Member {
  user_id: string;
  role: string;
  is_muted: boolean;
  is_banned: boolean;
}

const RoomChat: React.FC = () => {
  const { roomId } = useParams();
  const { lang } = useLanguage();
  const { user, isOwner: isAppOwner } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [myMembership, setMyMembership] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !roomId) {
      navigate('/rooms');
      return;
    }

    fetchRoom();
    fetchMessages();
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
        const { data: sender } = await supabase
          .from('profiles')
          .select('display_name, profile_picture, is_verified, is_vip, vip_type')
          .eq('user_id', payload.new.sender_id)
          .single();

        setMessages(prev => [...prev, { ...payload.new as Message, sender }]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    // Get member count
    const { count } = await supabase
      .from('chat_room_members')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('is_banned', false);

    setMemberCount(count || 0);
    setLoading(false);
  };

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

    // Fetch sender info for each message
    const messagesWithSenders = await Promise.all(
      (data || []).map(async (msg) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('display_name, profile_picture, is_verified, is_vip, vip_type')
          .eq('user_id', msg.sender_id)
          .single();

        return { ...msg, sender };
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

    // If banned, redirect
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

  const clearChat = async () => {
    if (!roomId || !isAppOwner) return;

    const { error } = await supabase
      .from('chat_room_messages')
      .update({ is_deleted: true, deleted_by: user?.id })
      .eq('room_id', roomId);

    if (error) {
      console.error('Error clearing chat:', error);
      toast.error(lang === 'ar' ? 'فشل مسح الدردشة' : 'Failed to clear chat');
      return;
    }

    setMessages([]);

    // Add system message
    await supabase
      .from('chat_room_messages')
      .insert({
        room_id: roomId,
        sender_id: user?.id,
        content: lang === 'ar' ? '🧹 تم مسح الدردشة' : '🧹 Chat has been cleared',
        message_type: 'system',
      });

    toast.success(lang === 'ar' ? 'تم مسح الدردشة' : 'Chat cleared');
  };

  const canModerate = isAppOwner || myMembership?.role === 'owner' || myMembership?.role === 'moderator';

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: room.background_color,
        backgroundImage: room.background_url ? `url(${room.background_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 glass-dark border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
            {room.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{room.name}</h1>
            <p className="text-xs text-muted-foreground">
              {memberCount} {lang === 'ar' ? 'عضو' : 'members'}
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setShowMembers(true)}>
            <Users className="w-5 h-5" />
          </Button>

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
                <DropdownMenuItem onClick={clearChat} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {lang === 'ar' ? 'مسح الدردشة' : 'Clear Chat'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Pinned Message */}
        {room.pinned_message && (
          <div className="px-4 pb-3">
            <div className="bg-primary/10 rounded-lg p-2 flex items-start gap-2">
              <Pin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">{room.pinned_message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {/* Welcome Message */}
          {room.welcome_message && (
            <div className="text-center py-4">
              <p className="inline-block px-4 py-2 rounded-full bg-primary/10 text-sm">
                {room.welcome_message}
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isSystem = msg.message_type === 'system' || msg.message_type === 'announcement';
            const isMe = msg.sender_id === user?.id;

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center py-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                    msg.message_type === 'announcement' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={msg.sender?.profile_picture || undefined} />
                  <AvatarFallback>
                    {msg.sender?.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1 mb-1 ${isMe ? 'justify-end' : ''}`}>
                    <span className="text-xs font-medium">{msg.sender?.display_name}</span>
                    {msg.sender?.is_vip && (
                      <Crown className="w-3 h-3 text-yellow-500" />
                    )}
                    {msg.sender?.is_verified && (
                      <Shield className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {new Date(msg.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="sticky bottom-0 glass-dark border-t border-border/50 p-4">
        {myMembership?.is_muted ? (
          <div className="text-center text-muted-foreground py-2">
            <VolumeX className="w-5 h-5 mx-auto mb-1" />
            <p className="text-sm">
              {lang === 'ar' ? 'أنت مكتوم في هذه الغرفة' : 'You are muted in this room'}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="gradient-primary"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <RoomSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        room={room}
        onUpdate={fetchRoom}
      />

      <RoomMembersModal
        isOpen={showMembers}
        onClose={() => setShowMembers(false)}
        roomId={room.id}
        canModerate={canModerate}
        isAppOwner={isAppOwner}
      />
    </div>
  );
};

export default RoomChat;
