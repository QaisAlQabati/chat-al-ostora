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
  Mic, MicOff, Video, VideoOff, ChevronLeft, Star, UserPlus
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
  profile_picture: string | null;
  message: string;
  type: 'message' | 'gift' | 'join';
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
  profile?: {
    display_name: string;
    profile_picture: string | null;
    level: number;
  };
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
  const [floatingLikes, setFloatingLikes] = useState<number[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const isLiveOwner = liveId === user?.id;

  useEffect(() => {
    if (liveId) {
      fetchLiveData();
      joinLive();
      subscribeToChat();
      subscribeToMembers();
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

  const subscribeToChat = () => {
    // Subscribe to realtime chat updates (using Supabase Broadcast)
    const channel = supabase
      .channel(`live-chat-${liveId}`)
      .on('broadcast', { event: 'chat' }, (payload) => {
        const msg = payload.payload as ChatMessage;
        setMessages(prev => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }]);
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

  const fetchRoomMembers = async () => {
    if (!liveId) return;
    
    try {
      const { data, error } = await supabase
        .from('live_room_members')
        .select('*')
        .eq('room_id', liveId);

      if (error) throw error;

      // Fetch profiles for members
      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, profile_picture, level')
            .eq('user_id', member.user_id)
            .single();
          return { ...member, profile: profileData };
        })
      );

      setRoomMembers(membersWithProfiles);
      setViewerCount(membersWithProfiles.length);
    } catch (error) {
      console.error('Error fetching room members:', error);
    }
  };

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
        
        // Broadcast join message
        await supabase.channel(`live-chat-${liveId}`).send({
          type: 'broadcast',
          event: 'chat',
          payload: joinMsg,
        });
      }

      fetchRoomMembers();
    } catch (error) {
      console.error('Error fetching live:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinLive = async () => {
    if (!user || !liveId) return;
    
    try {
      await supabase
        .from('live_room_members')
        .upsert({
          room_id: liveId,
          user_id: user.id,
        });

      // Update viewer count
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile) return;
    
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

    // Broadcast message
    await supabase.channel(`live-chat-${liveId}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    });
  };

  const handleLike = () => {
    setLiked(true);
    setLikeCount(prev => prev + 1);
    setFloatingLikes(prev => [...prev, Date.now()]);
    setTimeout(() => setLiked(false), 300);
    setTimeout(() => {
      setFloatingLikes(prev => prev.slice(1));
    }, 2000);
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

    // Broadcast gift message
    await supabase.channel(`live-chat-${liveId}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    });
  };

  const toggleMic = async () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        setMicEnabled(!micEnabled);
      } else {
        // Add audio track if not exists
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
          setMicEnabled(true);
        } catch (error) {
          console.error('Error adding audio:', error);
        }
      }
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-red-900">
            <span className="text-8xl font-bold text-white/30">
              {liveOwner?.display_name?.[0] || 'L'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          {/* Back Button */}
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
              <div className="flex items-center gap-1">
                <span className="text-xs text-yellow-400">⭐ Lv.{liveOwner?.level}</span>
              </div>
            </div>
            <Button
              size="sm"
              className="h-6 px-2 bg-pink-500 hover:bg-pink-600 text-white text-xs rounded-full ml-1"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              {lang === 'ar' ? 'متابعة' : 'Follow'}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewers */}
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <Users className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-medium">{viewerCount}</span>
          </div>
          
          {/* Live Badge */}
          <div className="px-2.5 py-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE</span>
          </div>
          
          {/* Close / End */}
          {isLiveOwner ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={endLive}
              className="rounded-full h-8 px-3 text-xs"
            >
              {lang === 'ar' ? 'إنهاء' : 'End'}
            </Button>
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

      {/* Owner Controls */}
      {isLiveOwner && (
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
        </div>
      )}

      {/* Chat Section - Bottom Half */}
      <div className="relative z-10 flex-1 flex flex-col justify-end">
        {/* Messages */}
        <ScrollArea className="flex-1 max-h-[45vh] px-3" ref={chatRef}>
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
                ) : msg.type === 'join' ? (
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

        {/* Bottom Actions */}
        <div className="p-3 flex items-center gap-2">
          {/* Chat Input */}
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

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Gift Button */}
            <Button
              onClick={() => setShowGiftModal(true)}
              className="w-11 h-11 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg"
            >
              <Gift className="w-5 h-5" />
            </Button>

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
      {roomMembers.length > 0 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 space-y-2">
          {roomMembers.slice(0, 5).map((member) => (
            <div
              key={member.id}
              className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-pink-500/50 cursor-pointer hover:ring-pink-500 transition-all"
              onClick={() => navigate(`/profile/${member.user_id}`)}
            >
              {member.profile?.profile_picture ? (
                <img src={member.profile.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold text-sm">
                  {member.profile?.display_name?.[0] || '?'}
                </div>
              )}
            </div>
          ))}
          {roomMembers.length > 5 && (
            <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white text-sm font-bold">
              +{roomMembers.length - 5}
            </div>
          )}
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
          onGiftSent={handleGiftSent}
        />
      )}
    </div>
  );
};

export default LiveRoom;
