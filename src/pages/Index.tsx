import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import StoriesBar from '@/components/stories/StoriesBar';
import AddStoryModal from '@/components/stories/AddStoryModal';
import StoryViewer from '@/components/stories/StoryViewer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Radio, Users, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LiveUser {
  user_id: string;
  is_live: boolean;
  viewer_count: number;
  title: string | null;
  profile: {
    username: string;
    display_name: string;
    profile_picture: string | null;
    is_verified: boolean;
    is_vip: boolean;
  };
}

const Index: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [showAddStory, setShowAddStory] = useState(false);
  const [viewingStory, setViewingStory] = useState<any>(null);
  const [activeLives, setActiveLives] = useState<LiveUser[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    fetchActiveLives();
    
    const channel = supabase
      .channel('lives')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_lives' }, () => {
        fetchActiveLives();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveLives = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_lives')
        .select('*')
        .eq('is_live', true)
        .order('viewer_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Fetch profiles separately
      const livesWithProfiles = await Promise.all(
        (data || []).map(async (live) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, display_name, profile_picture, is_verified, is_vip')
            .eq('user_id', live.user_id)
            .maybeSingle();
          return { ...live, profile: profileData };
        })
      );
      setActiveLives(livesWithProfiles as any);
    } catch (error) {
      console.error('Error fetching lives:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MainLayout>
      {/* Stories */}
      <StoriesBar
        onAddStory={() => setShowAddStory(true)}
        onViewStory={(group) => setViewingStory(group)}
      />

      <div className="px-4 space-y-6">
        {/* Welcome Card */}
        <Card className="gradient-card border-0 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-primary">
                {profile?.profile_picture ? (
                  <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl font-bold">
                    {profile?.display_name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold">
                  {lang === 'ar' ? `مرحباً، ${profile?.display_name}!` : `Welcome, ${profile?.display_name}!`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {lang === 'ar' ? 'ماذا تريد أن تفعل اليوم؟' : 'What would you like to do today?'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => navigate('/live')}
                className="flex-1 gradient-live gap-2"
              >
                <Radio className="w-4 h-4" />
                {t('startLive')}
              </Button>
              <Button
                onClick={() => setShowAddStory(true)}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {t('addStory')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Lives */}
        {activeLives.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Radio className="w-5 h-5 text-status-live" />
                {t('liveNow')}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/explore')}>
                {lang === 'ar' ? 'عرض الكل' : 'View All'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {activeLives.map((live) => (
                <Card
                  key={live.user_id}
                  className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => navigate(`/live/${live.user_id}`)}
                >
                  <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-secondary/20">
                    {live.profile?.profile_picture && (
                      <img
                        src={live.profile.profile_picture}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Live Badge */}
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-md gradient-live text-xs font-bold text-white flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>

                    {/* Viewers */}
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 text-xs text-white flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {live.viewer_count}
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                        {live.profile?.profile_picture ? (
                          <img src={live.profile.profile_picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white text-xs font-bold">
                            {live.profile?.display_name?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {live.profile?.display_name}
                        </p>
                        {live.title && (
                          <p className="text-xs text-muted-foreground truncate">
                            {live.title}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {activeLives.length === 0 && (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Radio className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {lang === 'ar' ? 'لا توجد لايفات نشطة' : 'No Active Lives'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {lang === 'ar' ? 'كن أول من يبدأ البث!' : 'Be the first to go live!'}
                </p>
              </div>
              <Button onClick={() => navigate('/live')} className="gradient-primary">
                {t('startLive')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <AddStoryModal
        isOpen={showAddStory}
        onClose={() => setShowAddStory(false)}
        onSuccess={() => {}}
      />

      {viewingStory && (
        <StoryViewer
          stories={viewingStory.stories}
          userInfo={viewingStory}
          onClose={() => setViewingStory(null)}
        />
      )}
    </MainLayout>
  );
};

export default Index;
