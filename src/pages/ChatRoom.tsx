import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import GiftModal from '@/components/gifts/GiftModal';
import {
  ChevronLeft, Send, Gift, Image, Mic, MoreVertical,
  BadgeCheck, Crown, Phone, Video, Smile
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  message_type: string;
  created_at: string;
  is_read: boolean;
}

interface OtherUser {
  user_id: string;
  username: string;
  display_name: string;
  profile_picture: string | null;
  is_verified: boolean;
  is_vip: boolean;
  status: string;
  level: number;
}

const ChatRoom: React.FC = () => {
  const { userId } = useParams();
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showGift, setShowGift] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId && user) {
      initializeChat();
    }
  }, [userId, user]);

  useEffect(() => {
    if (conversationId) {
      const channel = supabase
        .channel(`chat-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => [...prev, newMsg]);
            
            // Mark as read if from other user
            if (newMsg.sender_id !== user?.id) {
              markAsRead(newMsg.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Fetch other user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, profile_picture, is_verified, is_vip, status, level')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setOtherUser(userProfile);

      // Find or create conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_one.eq.${user!.id},participant_two.eq.${userId}),and(participant_one.eq.${userId},participant_two.eq.${user!.id})`)
        .maybeSingle();

      let convId = existingConv?.id;

      if (!convId) {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant_one: user!.id,
            participant_two: userId,
          })
          .select('id')
          .single();

        if (convError) throw convError;
        convId = newConv.id;
      }

      setConversationId(convId);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Mark unread messages as read
      const unreadIds = (messagesData || [])
        .filter(m => m.sender_id !== user!.id && !m.is_read)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user!.id,
          content: messageContent,
          message_type: 'text',
        });

      if (error) throw error;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messageContent.slice(0, 50),
        })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: false,
      locale: lang === 'ar' ? ar : enUS,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">
          {lang === 'ar' ? 'المستخدم غير موجود' : 'User not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/messages')}
            className="shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => navigate(`/profile/${otherUser.user_id}`)}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                {otherUser.profile_picture ? (
                  <img
                    src={otherUser.profile_picture}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-bold">
                    {otherUser.display_name[0]}
                  </div>
                )}
              </div>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                otherUser.status === 'online' ? 'bg-status-online' :
                otherUser.status === 'in_live' ? 'bg-status-live' :
                'bg-status-offline'
              )} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold truncate">
                  {otherUser.display_name}
                </span>
                {otherUser.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-diamond shrink-0" />
                )}
                {otherUser.is_vip && (
                  <Crown className="w-4 h-4 text-gold shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {otherUser.status === 'online' 
                  ? (lang === 'ar' ? 'متصل الآن' : 'Online now')
                  : otherUser.status === 'in_live'
                  ? (lang === 'ar' ? 'في بث مباشر' : 'In live')
                  : (lang === 'ar' ? 'غير متصل' : 'Offline')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4">
                {otherUser.profile_picture ? (
                  <img
                    src={otherUser.profile_picture}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white text-2xl font-bold">
                    {otherUser.display_name[0]}
                  </div>
                )}
              </div>
              <p className="font-semibold">{otherUser.display_name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === 'ar' ? 'ابدأ المحادثة' : 'Start a conversation'}
              </p>
            </div>
          )}

          {messages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const showAvatar = !isOwn && (
              index === 0 || messages[index - 1].sender_id !== message.sender_id
            );

            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-end gap-2",
                  isOwn ? "justify-end" : "justify-start"
                )}
              >
                {!isOwn && (
                  <div className="w-8 shrink-0">
                    {showAvatar && (
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                        {otherUser.profile_picture ? (
                          <img
                            src={otherUser.profile_picture}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white text-xs font-bold">
                            {otherUser.display_name[0]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className={cn(
                  "max-w-[75%] flex flex-col",
                  isOwn ? "items-end" : "items-start"
                )}>
                  {message.media_url && (
                    <img
                      src={message.media_url}
                      alt=""
                      className="max-w-full rounded-2xl mb-1"
                    />
                  )}
                  
                  {message.content && (
                    <div className={cn(
                      "px-4 py-2 rounded-2xl",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}

                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {formatTime(message.created_at)}
                    {isOwn && message.is_read && (
                      <span className="ml-1 text-primary">✓✓</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setShowGift(true)}
          >
            <Gift className="w-5 h-5 text-gold" />
          </Button>

          <Button variant="ghost" size="icon" className="shrink-0">
            <Image className="w-5 h-5" />
          </Button>

          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <Smile className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="shrink-0 gradient-primary"
          >
            <Send className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" className="shrink-0">
            <Mic className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Gift Modal */}
      <GiftModal
        isOpen={showGift}
        onClose={() => setShowGift(false)}
        receiverId={otherUser.user_id}
        receiverName={otherUser.display_name}
        context="chat"
      />
    </div>
  );
};

export default ChatRoom;
