import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Radio, TrendingUp, BadgeCheck, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProfile {
  user_id: string;
  username: string;
  display_name: string;
  profile_picture: string | null;
  bio: string;
  level: number;
  is_verified: boolean;
  is_vip: boolean;
  status: string;
}

interface LiveStream {
  user_id: string;
  title: string | null;
  viewer_count: number;
  profile: UserProfile;
}

const Explore: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [lives, setLives] = useState<LiveStream[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, profile_picture, bio, level, is_verified, is_vip, status')
        .neq('user_id', user?.id || '')
        .order('level', { ascending: false })
        .limit(50);

      setUsers(usersData || []);

      // Fetch lives
      const { data: livesData } = await supabase
        .from('personal_lives')
        .select('*')
        .eq('is_live', true)
        .order('viewer_count', { ascending: false });

      const livesWithProfiles = await Promise.all(
        (livesData || []).map(async (live) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, profile_picture, level, is_verified, is_vip, status')
            .eq('user_id', live.user_id)
            .maybeSingle();
          return { ...live, profile: profileData };
        })
      );
      setLives(livesWithProfiles as any);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        <Tabs defaultValue="users">
          <TabsList className="w-full">
            <TabsTrigger value="users" className="flex-1 gap-2">
              <Users className="w-4 h-4" />
              {t('users')}
            </TabsTrigger>
            <TabsTrigger value="live" className="flex-1 gap-2">
              <Radio className="w-4 h-4" />
              {t('live')}
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex-1 gap-2">
              <TrendingUp className="w-4 h-4" />
              {lang === 'ar' ? 'الأكثر' : 'Trending'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-2">
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((profile) => (
                <Card
                  key={profile.user_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/profile/${profile.user_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                          {profile.profile_picture ? (
                            <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold">
                              {profile.display_name[0]}
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                          profile.status === 'online' ? 'bg-status-online' :
                          profile.status === 'in_live' ? 'bg-status-live' :
                          'bg-status-offline'
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{profile.display_name}</p>
                          {profile.is_verified && <BadgeCheck className="w-4 h-4 text-diamond flex-shrink-0" />}
                          {profile.is_vip && <Crown className="w-4 h-4 text-gold flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground">@{profile.username}</p>
                      </div>

                      <div className="text-sm text-gold font-bold">
                        Lv.{profile.level}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">{t('noResults')}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="live" className="mt-4">
            {lives.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {lives.map((live) => (
                  <Card
                    key={live.user_id}
                    className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => navigate(`/live/${live.user_id}`)}
                  >
                    <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-secondary/20">
                      {live.profile?.profile_picture && (
                        <img src={live.profile.profile_picture} alt="" className="w-full h-full object-cover" />
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
                      <p className="text-sm font-medium truncate">{live.profile?.display_name}</p>
                      {live.title && <p className="text-xs text-muted-foreground truncate">{live.title}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Radio className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">
                    {lang === 'ar' ? 'لا توجد لايفات نشطة' : 'No active lives'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trending" className="mt-4">
            <Card className="text-center py-12">
              <CardContent>
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  {lang === 'ar' ? 'قريباً' : 'Coming Soon'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Explore;
