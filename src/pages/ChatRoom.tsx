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
  BadgeCheck, Crown, Phone, Video, Smile, X, Loader2, StopCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

const EMOJI_LIST = ['😀', '😂', '😍', '🥰', '😊', '😎', '🤩', '😘', '🤗', '🤔', '😅', '😇', '🥺', '😢', '😭', '😤', '😡', '🤯', '😱', '🙄', '👍', '👎', '❤️', '🔥', '💯', '🎉', '👏', '🙏', '💪', '✨'];

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, profile_picture, is_verified, is_vip, status, level')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setOtherUser(userProfile);

      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_one.eq.${user!.id},participant_two.eq.${userId}),and(participant_one.eq.${userId},participant_two.eq.${user!.id})`)
        .maybeSingle();

      let convId = existingConv?.id;

      if (!convId) {
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

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

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

  const sendMessage = async (content?: string, mediaUrl?: string, messageType: string = 'text') => {
    const messageContent = content || newMessage.trim();
    if ((!messageContent && !mediaUrl) || !conversationId || sending) return;

    setSending(true);
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user!.id,
          content: messageContent || null,
          media_url: mediaUrl || null,
          message_type: messageType as any,
        });

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messageType === 'image' ? '📷 صورة' : messageType === 'audio' ? '🎤 رسالة صوتية' : messageContent?.slice(0, 50),
        })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      await sendMessage('', publicUrl, 'image');
      toast.success(lang === 'ar' ? 'تم إرسال الصورة' : 'Image sent');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(lang === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await uploadAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error(lang === 'ar' ? 'فشل تشغيل المايكروفون' : 'Failed to start microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const uploadAudio = async (audioBlob: Blob) => {
    if (!user) return;

    try {
      const fileName = `${user.id}/${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      await sendMessage('', publicUrl, 'audio');
      toast.success(lang === 'ar' ? 'تم إرسال الرسالة الصوتية' : 'Voice message sent');
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة الصوتية' : 'Failed to send voice message');
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: false,
      locale: lang === 'ar' ? ar : enUS,
    });
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                otherUser.status === 'online' ? 'bg-green-500' :
                otherUser.status === 'in_live' ? 'bg-red-500' :
                'bg-gray-500'
              )} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold truncate">
                  {otherUser.display_name}
                </span>
                {otherUser.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                {otherUser.is_vip && (
                  <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
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
            <Button variant="ghost" size="icon" onClick={() => toast.info(lang === 'ar' ? 'قريباً' : 'Coming soon')}>
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => toast.info(lang === 'ar' ? 'قريباً' : 'Coming soon')}>
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
                  {message.message_type === 'image' && message.media_url && (
                    <img
                      src={message.media_url}
                      alt=""
                      className="max-w-full rounded-2xl mb-1 max-h-64 object-cover"
                    />
                  )}

                  {message.message_type === 'audio' && message.media_url && (
                    <audio controls className="max-w-full mb-1">
                      <source src={message.media_url} type="audio/webm" />
                    </audio>
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
        {isRecording ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-destructive/10 rounded-full px-4 py-2">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
              <span className="text-sm text-muted-foreground">
                {lang === 'ar' ? 'جاري التسجيل...' : 'Recording...'}
              </span>
            </div>
            <Button
              size="icon"
              variant="destructive"
              onClick={stopRecording}
              className="shrink-0"
            >
              <StopCircle className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setShowGift(true)}
            >
              <Gift className="w-5 h-5 text-yellow-500" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Image className="w-5 h-5" />
              )}
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
                className="pr-10"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    <Smile className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="end">
                  <div className="grid grid-cols-6 gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="text-xl p-2 hover:bg-muted rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {newMessage.trim() ? (
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={sending}
                className="shrink-0 gradient-primary"
              >
                <Send className="w-5 h-5" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0"
                onClick={startRecording}
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
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