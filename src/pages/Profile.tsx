import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ProfileHeader from '@/components/profile/ProfileHeader';
import EditProfileModal from '@/components/profile/EditProfileModal';
import GiftModal from '@/components/gifts/GiftModal';
import GiftsFolder from '@/components/gifts/GiftsFolder';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Image, Radio, Gift, Award, Clock, Copy, CheckCircle2 } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  email: string | null;
  profile_picture: string | null;
  cover_picture: string | null;
  bio: string;
  country: string;
  city: string;
  points: number;
  ruby: number;
  diamonds: number;
  level: number;
  is_vip: boolean;
  vip_type: string | null;
  is_verified: boolean;
  created_at: string;
}

const Profile: React.FC = () => {
  const { userId } = useParams();
  const { user, profile: myProfile, loading } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, friends: 0 });
  const [showEdit, setShowEdit] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [stories, setStories] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (targetUserId) {
      fetchProfile();
      fetchStats();
      fetchStories();
    }
  }, [targetUserId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCopyLink = async () => {
    const profileLink = `${window.location.origin}/profile/${profile?.user_id}`;
    try {
      await navigator.clipboard.writeText(profileLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Followers count
      const { count: followers } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      // Following count
      const { count: following } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      // Friends count
      const { count: friends } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`)
        .eq('status', 'accepted');

      setStats({
        followers: followers || 0,
        following: following || 0,
        friends: friends || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  if (loading || loadingProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground">
            {lang === 'ar' ? 'المستخدم غير موجود' : 'User not found'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ProfileHeader
        profile={profile}
        stats={stats}
        isOwnProfile={isOwnProfile}
        onEdit={() => setShowEdit(true)}
        onMessage={() => navigate(`/messages/${profile.user_id}`)}
        onGift={() => setShowGift(true)}
        onFollow={() => {}}
      />

      <Tabs defaultValue="info" className="mt-6 px-4">
        <TabsList className="w-full justify-start bg-muted/50 p-1 overflow-x-auto">
          <TabsTrigger value="info" className="gap-2 text-xs sm:text-sm">
            <span>📋</span>
            {lang === 'ar' ? 'معلوماتي' : 'My Info'}
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2 text-xs sm:text-sm">
            <span>📊</span>
            {lang === 'ar' ? 'المعلومات' : 'Info'}
          </TabsTrigger>
          <TabsTrigger value="gifts" className="gap-2 text-xs sm:text-sm">
            <Gift className="w-4 h-4" />
            {lang === 'ar' ? 'الهدايا' : 'Gifts'}
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-2 text-xs sm:text-sm">
            <Image className="w-4 h-4" />
            {t('stories')}
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2 text-xs sm:text-sm">
            <Radio className="w-4 h-4" />
            {t('live')}
          </TabsTrigger>
        </TabsList>

        {/* معلوماتي - My Info Tab */}
        <TabsContent value="info" className="mt-4 space-y-4">
          {profile && (
            <div className="space-y-4">
              {/* Profile Link */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">
                      {lang === 'ar' ? '🔗 رابط الملف الشخصي' : '🔗 Profile Link'}
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/profile/${profile.user_id}`}
                      readOnly
                      className="flex-1 px-3 py-2 bg-muted rounded border border-border text-sm text-muted-foreground"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                      {copiedLink ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Gender */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{lang === 'ar' ? '⚧️ الجنس' : '⚧️ Gender'}</span>
                    <span className="font-medium text-right">{profile.country || '—'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Country */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{lang === 'ar' ? '🌍 البلد' : '🌍 Country'}</span>
                    <span className="font-medium text-right">{profile.country || '—'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Join Date */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{lang === 'ar' ? '📅 تاريخ الانضمام' : '📅 Join Date'}</span>
                    <span className="font-medium text-right">
                      {new Date(profile.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Current Room */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{lang === 'ar' ? '🏠 الغرفة الحالية' : '🏠 Current Room'}</span>
                    <span className="font-medium text-right">{profile.bio || '—'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* المعلومات - Statistics Tab */}
        <TabsContent value="stats" className="mt-4 space-y-4">
          {profile && (
            <div className="space-y-4">
              {/* Ruby */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">💎 {lang === 'ar' ? 'الروبي الحالي' : 'Current Ruby'}</span>
                    <span className="font-bold text-rose-400 text-lg">{profile.ruby}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Points */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">⭐ {lang === 'ar' ? 'النقاط' : 'Points'}</span>
                    <span className="font-bold text-amber-400 text-lg">{profile.points}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Level */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">🏆 {lang === 'ar' ? 'المستوى' : 'Level'}</span>
                    <span className="font-bold text-lg">{profile.level}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Followers */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">👥 {lang === 'ar' ? 'المتابعون' : 'Followers'}</span>
                    <span className="font-bold text-lg">{stats.followers}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Following */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">📍 {lang === 'ar' ? 'المتابع' : 'Following'}</span>
                    <span className="font-bold text-lg">{stats.following}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Last Seen */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">👁️ {lang === 'ar' ? 'آخر تواجد' : 'Last Seen'}</span>
                    <span className="font-medium text-right text-sm">
                      {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stories" className="mt-4">
          {stories.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="aspect-[9/16] rounded-lg overflow-hidden bg-muted"
                >
                  {story.media_type === 'video' ? (
                    <video src={story.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Image className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">{t('noStories')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="live" className="mt-4">
          <Card className="text-center py-12">
            <CardContent>
              <Radio className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                {lang === 'ar' ? 'لا يوجد بث مباشر حالياً' : 'No live stream right now'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gifts" className="mt-4">
          {profile && (
            <GiftsFolder
              userId={profile.user_id}
              isOwnProfile={isOwnProfile}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          onSuccess={fetchProfile}
        />
      )}

      {!isOwnProfile && (
        <GiftModal
          isOpen={showGift}
          onClose={() => setShowGift(false)}
          receiverId={profile.user_id}
          receiverName={profile.display_name}
        />
      )}
    </MainLayout>
  );
};

export default Profile;
