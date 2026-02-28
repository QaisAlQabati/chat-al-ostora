import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ProfileHeader from '@/components/profile/ProfileHeader';
import EditProfileModal from '@/components/profile/EditProfileModal';
import GiftModal from '@/components/gifts/GiftModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Image, Radio, Gift, Award, Clock, User, BarChart2, Copy } from 'lucide-react';

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
  gender?: string;
  language?: string;
  current_room?: string;
  last_seen?: string;
  gold?: number;
  today_points?: number;
  weekly_interaction_points?: number;
  competition_points?: number;
  kings_rank?: number;
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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    const profileLink = `${window.location.origin}/#id${profile?.id}`;
    navigator.clipboard.writeText(profileLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

      <Tabs defaultValue="myinfo" className="mt-6 px-4">
        <TabsList className="w-full justify-start bg-muted/50 p-1 flex flex-wrap gap-1">

          {/* ── التبويبات الجديدة (معلوماتي / المعلومات / الهدايا) ── */}
          <TabsTrigger value="myinfo" className="flex-1 gap-2">
            <User className="w-4 h-4" />
            {lang === 'ar' ? 'معلوماتي' : 'My Info'}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 gap-2">
            <BarChart2 className="w-4 h-4" />
            {lang === 'ar' ? 'المعلومات' : 'Stats'}
          </TabsTrigger>

          {/* ── التبويبات القديمة (stories / live / gifts) ── */}
          <TabsTrigger value="stories" className="flex-1 gap-2">
            <Image className="w-4 h-4" />
            {t('stories')}
          </TabsTrigger>
          <TabsTrigger value="live" className="flex-1 gap-2">
            <Radio className="w-4 h-4" />
            {t('live')}
          </TabsTrigger>
          <TabsTrigger value="gifts" className="flex-1 gap-2">
            <Gift className="w-4 h-4" />
            {t('gifts')}
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════
            تبويب معلوماتي (الجديد)
        ════════════════════════════════════════ */}
        <TabsContent value="myinfo" className="mt-4">
          <Card>
            <CardContent className="pt-4 space-y-0 divide-y divide-border">

              {/* رابط الملف الشخصي */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  🔗 {lang === 'ar' ? 'رابط الملف الشخصي' : 'Profile Link'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary truncate max-w-[160px]">
                    {`${window.location.origin}/#id${profile.id}`}
                  </span>
                  <button onClick={handleCopyLink} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {copied ? '✅' : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* الجنس */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  ⚧️ {lang === 'ar' ? 'الجنس' : 'Gender'}
                </span>
                <span className="text-sm font-medium">
                  {profile.gender
                    ? lang === 'ar'
                      ? profile.gender === 'male' ? 'ذكر' : 'أنثى'
                      : profile.gender
                    : '—'}
                </span>
              </div>

              {/* البلد */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  🌍 {lang === 'ar' ? 'البلد' : 'Country'}
                </span>
                <span className="text-sm font-medium">{profile.country || '—'} 🌐</span>
              </div>

              {/* اللغة */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  🗣️ {lang === 'ar' ? 'اللغة' : 'Language'}
                </span>
                <span className="text-sm font-medium">{profile.language || (lang === 'ar' ? 'Arabic' : 'Arabic')} 🔤</span>
              </div>

              {/* تاريخ الانضمام */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  📅 {lang === 'ar' ? 'تاريخ الانضمام' : 'Join Date'}
                </span>
                <span className="text-sm font-medium">
                  {profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : '—'} 👤
                </span>
              </div>

              {/* الغرفة الحالية */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  🏠 {lang === 'ar' ? 'الغرفة الحالية' : 'Current Room'}
                </span>
                <span className="text-sm font-medium">{profile.current_room || '—'} 🏠</span>
              </div>

              {/* آخر تواجد */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  👁️ {lang === 'ar' ? 'آخر تواجد' : 'Last Seen'}
                </span>
                <span className="text-sm font-medium">
                  {profile.last_seen
                    ? new Date(profile.last_seen).toLocaleString(lang === 'ar' ? 'ar-YE' : 'en-US')
                    : '—'} 👁️
                </span>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════
            تبويب المعلومات (الجديد)
        ════════════════════════════════════════ */}
        <TabsContent value="stats" className="mt-4">
          <Card>
            <CardContent className="pt-4 space-y-0 divide-y divide-border">

              {/* الجواهر */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  💎 {lang === 'ar' ? 'الجواهر الحالية' : 'Current Diamonds'}
                </span>
                <span className="text-sm font-bold text-primary">{profile.diamonds ?? 0}</span>
              </div>

              {/* النقاط */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  ⭐ {lang === 'ar' ? 'النقاط' : 'Points'}
                </span>
                <span className="text-sm font-bold">{profile.points ?? 0}</span>
              </div>

              {/* النقاط المجموعة اليوم */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  📊 {lang === 'ar' ? 'النقاط المجموعة اليوم' : "Today's Points"}
                </span>
                <span className="text-sm font-bold">{profile.today_points ?? 0}</span>
              </div>

              {/* نقاط تفاعل لهذا الأسبوع */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  🏆 {lang === 'ar' ? 'نقاط تفاعل لهذا الأسبوع' : 'Weekly Interaction Points'}
                </span>
                <span className="text-sm font-bold">{profile.weekly_interaction_points ?? 0}</span>
              </div>

              {/* نقاط المسابقات */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  🏁 {lang === 'ar' ? 'نقاط المسابقات' : 'Competition Points'}
                </span>
                <span className="text-sm font-bold">{profile.competition_points ?? 0}</span>
              </div>

              {/* الترتيب في قائمة الملوك */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  👑 {lang === 'ar' ? 'ترتيبك في قائمة الملوك' : 'Kings List Rank'}
                </span>
                <span className="text-sm font-bold">
                  {profile.kings_rank
                    ? `${lang === 'ar' ? 'المركز' : 'Rank'} ${profile.kings_rank}`
                    : '—'}
                </span>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════
            التبويبات القديمة (كما هي بدون تعديل)
        ════════════════════════════════════════ */}
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
          <Card className="text-center py-12">
            <CardContent>
              <Gift className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                {lang === 'ar' ? 'لا توجد هدايا بعد' : 'No gifts yet'}
              </p>
            </CardContent>
          </Card>
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
