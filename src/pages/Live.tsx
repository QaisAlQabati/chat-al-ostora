import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Users, Play, Settings, Mic, MicOff, Video, VideoOff, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Live: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [isLive, setIsLive] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [viewers, setViewers] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    // Check if user already has an active live
    if (user) {
      checkExistingLive();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      // Cleanup stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const checkExistingLive = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('personal_lives')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.is_live) {
      setIsLive(true);
      setLiveTitle(data.title || '');
      setViewers(data.viewer_count || 0);
    }
  };

  const startLive = async () => {
    if (!user) return;

    setStarting(true);
    try {
      // Request camera and microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: cameraEnabled,
        audio: micEnabled,
      });
      setStream(mediaStream);

      // Update database
      const { error } = await supabase
        .from('personal_lives')
        .upsert({
          user_id: user.id,
          title: liveTitle || `${profile?.display_name}'s Live`,
          is_live: true,
          started_at: new Date().toISOString(),
          viewer_count: 0,
        });

      if (error) throw error;

      setIsLive(true);
      toast.success(lang === 'ar' ? 'بدأ البث المباشر!' : 'Live stream started!');
    } catch (error: any) {
      console.error('Error starting live:', error);
      if (error.name === 'NotAllowedError') {
        toast.error(lang === 'ar' ? 'يرجى السماح بالوصول للكاميرا والميكروفون' : 'Please allow camera and microphone access');
      } else {
        toast.error(lang === 'ar' ? 'فشل بدء البث' : 'Failed to start live');
      }
    } finally {
      setStarting(false);
    }
  };

  const endLive = async () => {
    if (!user) return;

    try {
      // Stop stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Update database
      await supabase
        .from('personal_lives')
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      setIsLive(false);
      toast.success(lang === 'ar' ? 'انتهى البث!' : 'Live ended!');
    } catch (error) {
      console.error('Error ending live:', error);
    }
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="px-4 py-4">
        <Tabs defaultValue="my-live">
          <TabsList className="w-full">
            <TabsTrigger value="my-live" className="flex-1 gap-2">
              <Radio className="w-4 h-4" />
              {t('personalLive')}
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex-1 gap-2">
              <Users className="w-4 h-4" />
              {t('publicRooms')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-live" className="mt-4">
            {isLive ? (
              // Live Stream View
              <div className="space-y-4">
                <Card className="overflow-hidden">
                  <div className="aspect-video relative bg-black">
                    <video
                      ref={(video) => {
                        if (video && stream) {
                          video.srcObject = stream;
                        }
                      }}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Live Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <div className="px-3 py-1 gradient-live rounded-full flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-sm font-bold text-white">LIVE</span>
                      </div>
                      <div className="px-3 py-1 bg-black/60 rounded-full flex items-center gap-2">
                        <Users className="w-4 h-4 text-white" />
                        <span className="text-sm text-white">{viewers}</span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <Input
                      value={liveTitle}
                      onChange={(e) => setLiveTitle(e.target.value)}
                      placeholder={lang === 'ar' ? 'عنوان البث...' : 'Live title...'}
                      className="mb-4"
                    />

                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant={micEnabled ? 'outline' : 'destructive'}
                        size="icon"
                        onClick={toggleMic}
                        className="w-12 h-12 rounded-full"
                      >
                        {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={endLive}
                        className="w-16 h-16 rounded-full"
                      >
                        <X className="w-6 h-6" />
                      </Button>
                      
                      <Button
                        variant={cameraEnabled ? 'outline' : 'destructive'}
                        size="icon"
                        onClick={toggleCamera}
                        className="w-12 h-12 rounded-full"
                      >
                        {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Start Live View
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-20 h-20 mx-auto rounded-full gradient-live flex items-center justify-center shadow-live">
                      <Radio className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">
                      {lang === 'ar' ? 'ابدأ البث المباشر' : 'Start Your Live'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {lang === 'ar' 
                        ? 'شارك لحظاتك مع متابعيك'
                        : 'Share your moments with your followers'}
                    </p>
                  </div>

                  <Input
                    value={liveTitle}
                    onChange={(e) => setLiveTitle(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل عنوان البث...' : 'Enter live title...'}
                  />

                  <div className="flex items-center justify-center gap-8">
                    <button
                      onClick={() => setMicEnabled(!micEnabled)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
                        micEnabled ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {micEnabled ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                      <span className="text-xs">{lang === 'ar' ? 'الميكروفون' : 'Microphone'}</span>
                    </button>
                    
                    <button
                      onClick={() => setCameraEnabled(!cameraEnabled)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
                        cameraEnabled ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {cameraEnabled ? <Video className="w-8 h-8" /> : <VideoOff className="w-8 h-8" />}
                      <span className="text-xs">{lang === 'ar' ? 'الكاميرا' : 'Camera'}</span>
                    </button>
                  </div>

                  <Button
                    onClick={startLive}
                    disabled={starting}
                    className="w-full gradient-live gap-2 h-12 text-lg"
                  >
                    {starting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        {t('startLive')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rooms" className="mt-4">
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  {lang === 'ar' ? 'لا توجد غرف عامة حالياً' : 'No public rooms available'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {lang === 'ar' ? 'الغرف العامة ينشئها المالك فقط' : 'Public rooms are created by the owner only'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Live;
