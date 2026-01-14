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
  X, Heart, Gift, Send, Users, Share2, 
  MoreVertical, Crown, BadgeCheck, Volume2, VolumeX,
  Mic, MicOff, Video, VideoOff, ChevronLeft, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  message: string;
  type: 'message' | 'gift' | 'join';
  giftEmoji?: string;
  giftCount?: number;
  level?: number;
  timestamp: Date;
}

const LiveRoom: React.FC = () => {
  const { liveId } = useParams();
  const { lang } = useLanguage();
  const { user, profile, isOwner: isSiteOwner } = useAuth();
  const navigate = useNavigate();
  
  const [liveOwner, setLiveOwner] = useState<LiveOwner | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const isLiveOwner = liveId === user?.id;

  useEffect(() => {
    if (liveId) {
      fetchLiveData();
      joinLive();
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
    }
  };

  const fetchLiveData = async () => {
    try {
      const { data: live, error } = await supabase
        .from('personal_lives')
        .select('*')
        .eq('user_id', liveId)
        .maybeSingle();

      if (error) throw error;
      
      if (!live?.is_live) {
        toast.error(lang === 'ar' ? 'البث غير متاح' : 'Live not available');
        navigate('/');
        return;
      }

      setLiveData(live);
      setViewerCount(live.viewer_count || 0);

      // Fetch owner profile
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, profile_picture, is_verified, is_vip, level')
        .eq('user_id', liveId)
        .single();

      if (ownerProfile) {
        setLiveOwner(ownerProfile);
      }

      // Add join message
      if (profile) {
        addSystemMessage({
          id: Date.now().toString(),
          user_id: user?.id || '',
          username: profile.username,
          display_name: profile.display_name,
          message: lang === 'ar' ? 'انضم إلى البث' : 'joined the live',
          type: 'join',
          level: profile.level,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Error fetching live:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinLive = async () => {
    if (!user || !liveId) return;
    
    try {
      // Add to room members
      await supabase
        .from('live_room_members')
        .upsert({
          room_id: liveId,
          user_id: user.id,
        });
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

  const addSystemMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !profile) return;
    
    const msg: ChatMessage = {
      id: Date.now().toString(),
      user_id: user?.id || '',
      username: profile.username,
      display_name: profile.display_name,
      message: newMessage,
      type: 'message',
      level: profile.level,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const handleLike = () => {
    setLiked(true);
    setLikeCount(prev => prev + 1);
    setTimeout(() => setLiked(false), 1000);
  };

  const handleGiftSent = (giftEmoji: string, quantity: number) => {
    if (!profile) return;
    
    const msg: ChatMessage = {
      id: Date.now().toString(),
      user_id: user?.id || '',
      username: profile.username,
      display_name: profile.display_name,
      message: lang === 'ar' ? `أرسل ${quantity} هدية` : `sent ${quantity} gift`,
      type: 'gift',
      giftEmoji,
      giftCount: quantity,
      level: profile.level,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, msg]);
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setCameraEnabled(!cameraEnabled);
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
        ) : liveOwner?.profile_picture ? (
          <img
            src={liveOwner.profile_picture}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/30">
            <span className="text-8xl font-bold text-white/30">
              {liveOwner?.display_name?.[0] || 'L'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="bg-black/40 hover:bg-black/60 text-white rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          {/* Streamer Info */}
          <div className="flex items-center gap-2 bg-black/40 rounded-full pr-4 pl-1 py-1">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary">
              {liveOwner?.profile_picture ? (
                <img src={liveOwner.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-bold">
                  {liveOwner?.display_name?.[0]}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-white font-semibold text-sm">
                  {liveOwner?.display_name}
                </span>
                {liveOwner?.is_verified && <BadgeCheck className="w-4 h-4 text-diamond" />}
                {liveOwner?.is_vip && <Crown className="w-3 h-3 text-gold" />}
              </div>
              <span className="text-xs text-white/70">
                ⭐ {lang === 'ar' ? `مستوى ${liveOwner?.level}` : `Level ${liveOwner?.level}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewers */}
          <div className="flex items-center gap-1 bg-black/40 rounded-full px-3 py-1.5">
            <Users className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">{viewerCount}</span>
          </div>
          
          {/* Live Badge */}
          <div className="px-3 py-1 gradient-live rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-sm font-bold">LIVE</span>
          </div>
          
          {/* Close / End */}
          {isLiveOwner ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={endLive}
              className="rounded-full"
            >
              {lang === 'ar' ? 'إنهاء' : 'End'}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="bg-black/40 hover:bg-black/60 text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Owner Controls */}
      {isLiveOwner && (
        <div className="relative z-10 flex justify-center gap-4 mt-auto mb-4 px-4">
          <Button
            variant={micEnabled ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleMic}
            className="w-12 h-12 rounded-full"
          >
            {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          <Button
            variant={cameraEnabled ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleCamera}
            className="w-12 h-12 rounded-full"
          >
            {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
        </div>
      )}

      {/* Chat Section - Bottom Half */}
      <div className="relative z-10 flex-1 flex flex-col justify-end max-h-[60vh]">
        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={chatRef}>
          <div className="space-y-2 pb-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 animate-slide-up">
                {msg.type === 'gift' ? (
                  <div className="flex items-center gap-2 bg-gradient-to-r from-gold/30 to-primary/30 rounded-full px-3 py-2">
                    <span className="text-2xl">{msg.giftEmoji}</span>
                    <div>
                      <span className="text-gold font-bold text-sm">{msg.display_name}</span>
                      <span className="text-white text-sm mx-1">{msg.message}</span>
                      <span className="text-gold text-lg font-bold">x{msg.giftCount}</span>
                    </div>
                  </div>
                ) : msg.type === 'join' ? (
                  <div className="text-white/60 text-sm">
                    <span className="font-medium text-accent">{msg.display_name}</span>
                    <span className="mx-1">{msg.message}</span>
                  </div>
                ) : (
                  <div className="bg-black/40 rounded-2xl px-3 py-2 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/50 text-white font-bold">
                        {msg.level}
                      </span>
                      <span className="text-primary font-medium text-sm">{msg.display_name}</span>
                    </div>
                    <p className="text-white text-sm mt-1">{msg.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="p-4 flex items-center gap-3">
          {/* Chat Input */}
          <div className="flex-1 flex items-center gap-2 bg-black/40 rounded-full px-4 py-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={lang === 'ar' ? 'إضافة تعليق...' : 'Add a comment...'}
              className="flex-1 bg-transparent border-0 text-white placeholder:text-white/50 focus-visible:ring-0 p-0 h-auto"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSendMessage}
              className="text-white hover:text-primary h-8 w-8"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Gift Button */}
            <Button
              onClick={() => setShowGiftModal(true)}
              className="w-12 h-12 rounded-full gradient-gold text-black"
            >
              <Gift className="w-5 h-5" />
            </Button>

            {/* Like Button */}
            <Button
              onClick={handleLike}
              variant="ghost"
              className={cn(
                "w-12 h-12 rounded-full bg-black/40 text-white",
                liked && "text-red-500 scale-110"
              )}
            >
              <Heart className={cn("w-5 h-5", liked && "fill-current")} />
            </Button>

            {/* Share Button */}
            <Button
              variant="ghost"
              className="w-12 h-12 rounded-full bg-black/40 text-white"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Likes Animation */}
      {liked && (
        <div className="absolute bottom-32 right-8 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <Heart
              key={i}
              className="absolute text-red-500 fill-current animate-float"
              style={{
                animationDelay: `${i * 0.1}s`,
                left: `${Math.random() * 20}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Gift Modal */}
      {liveOwner && (
        <GiftModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          receiverId={liveOwner.user_id}
          receiverName={liveOwner.display_name}
          context="live"
          liveId={liveId}
        />
      )}
    </div>
  );
};

export default LiveRoom;
