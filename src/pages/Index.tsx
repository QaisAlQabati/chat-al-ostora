import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import StoriesBar from '@/components/stories/StoriesBar';
import AddStoryModal from '@/components/stories/AddStoryModal';
import StoryViewer from '@/components/stories/StoryViewer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Radio, Users, TrendingUp, Wifi, Crown, Star, Shield, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

interface OnlineUser {
  user_id: string;
  display_name: string;
  profile_picture: string | null;
  level: number;
  is_vip: boolean;
  is_verified: boolean;
  maxRole: string;
}

interface TrendingUser {
  user_id: string;
  display_name: string;
  profile_picture: string | null;
  level: number;
  is_vip: boolean;
  total_gifts_received: number;
}

const Index: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [showAddStory, setShowAddStory] = useState(false);
  const [viewingStory, setViewingStory] = useState<any>(null);
  const [activeLives, setActiveLives] = useState<LiveUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [trendingUsers, setTrendingUsers] = useState<TrendingUser[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchActiveLives();
      fetchOnlineUsers();
      fetchTrendingUsers();
    }
    
    const channel = supabase
      .channel('lives')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_lives' }, () => {
        fetchActiveLives();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchActiveLives = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_lives')
        .select('*')
        .eq('is_live', true)
        .order('viewer_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      
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

  const fetchOnlineUsers = async () => {
    try {
      // Fetch users who were recently active (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, profile_picture, level, is_vip, is_verified')
        .gte('last_seen', fiveMinutesAgo)
        .order('last_seen', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (p) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', p.user_id);

          let maxRole = 'user';
          let maxLevel = 1;
          const roleOrder: Record<string, number> = {
            owner: 6, super_owner: 6, super_admin: 5, admin: 4, moderator: 3, vip: 2, user: 1
          };
          (roles || []).forEach((r: any) => {
            if (roleOrder[r.role] > maxLevel) {
              maxLevel = roleOrder[r.role];
              maxRole = r.role;
            }
          });

          return { ...p, maxRole };
        })
      );

      setOnlineUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };

  const fetchTrendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, profile_picture, level, is_vip, total_gifts_received')
        .order('total_gifts_received', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTrendingUsers(data || []);
    } catch (error) {
      console.error('Error fetching trending users:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'super_owner':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'super_admin':
      case 'admin':
        return <Shield className="w-3 h-3 text-purple-500" />;
      case 'moderator':
        return <Star className="w-3 h-3 text-blue-500" />;
      case 'vip':
        return <Sparkles className="w-3 h-3 text-amber-500" />;
      default:
        return null;
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

        {/* Online Users Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-500" />
              {lang === 'ar' ? 'متصلين الآن' : 'Online Now'}
              <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                {onlineUsers.length}
              </span>
            </h2>
            <Button variant="ghost" size="sm" className="text-xs">
              {lang === 'ar' ? 'عرض الكل' : 'View All'}
            </Button>
          </div>

          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-2">
              {onlineUsers.map((u) => (
                <div
                  key={u.user_id}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => navigate(`/profile/${u.user_id}`)}
                >
                  <div className="relative">
                    <Avatar className="w-14 h-14 ring-2 ring-green-500">
                      <AvatarImage src={u.profile_picture || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                        {u.display_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    {/* Role icon */}
                    {getRoleIcon(u.maxRole) && (
                      <span className="absolute -top-1 -right-1 bg-background rounded-full p-0.5">
                        {getRoleIcon(u.maxRole)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-center max-w-14 truncate">{u.display_name}</span>
                  <span className="text-[9px] text-primary bg-primary/10 px-1.5 rounded">
                    Lv.{u.level || 1}
                  </span>
                </div>
              ))}
              {onlineUsers.length === 0 && (
                <div className="w-full text-center text-sm text-muted-foreground py-4">
                  {lang === 'ar' ? 'لا يوجد متصلين حالياً' : 'No users online'}
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>

        {/* Trending Users Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              {lang === 'ar' ? 'الأكثر رواجاً' : 'Trending'}
            </h2>
            <Button variant="ghost" size="sm" className="text-xs">
              {lang === 'ar' ? 'عرض الكل' : 'View All'}
            </Button>
          </div>

          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-2">
              {trendingUsers.map((u, index) => (
                <div
                  key={u.user_id}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => navigate(`/profile/${u.user_id}`)}
                >
                  <div className="relative">
                    <Avatar className="w-14 h-14 ring-2 ring-orange-500">
                      <AvatarImage src={u.profile_picture || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
                        {u.display_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {/* Rank badge */}
                    {index < 3 && (
                      <span className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-700'
                      }`}>
                        {index + 1}
                      </span>
                    )}
                    {u.is_vip && (
                      <span className="absolute -top-1 -right-1 bg-background rounded-full p-0.5">
                        <Crown className="w-3 h-3 text-yellow-500" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-center max-w-14 truncate">{u.display_name}</span>
                  <span className="text-[9px] text-orange-500 bg-orange-500/10 px-1.5 rounded">
                    Lv.{u.level || 1}
                  </span>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>

        {/* Active Lives */}
        {activeLives.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Radio className="w-4 h-4 text-status-live" />
                {t('liveNow')}
              </h2>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/explore')}>
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
                    
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-md gradient-live text-xs font-bold text-white flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>

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
        ) : (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Radio className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {lang === 'ar' ? 'لا توجد بثوث مباشرة الآن' : 'No Active Lives'}
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
