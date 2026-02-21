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
import { Image, Radio, Gift, Award, Clock } from 'lucide-react';

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

      <Tabs defaultValue="stories" className="mt-6 px-4">
        <TabsList className="w-full justify-start bg-muted/50 p-1">
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
