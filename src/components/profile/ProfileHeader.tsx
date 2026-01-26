import React, { useState, useEffect } from 'react';
import { BadgeCheck, Crown, Edit, MessageCircle, Gift, UserPlus, UserCheck, Shield, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import RoleBadge from '@/components/common/RoleBadge';
import { useUserRole } from '@/hooks/useUserRole';

interface ProfileHeaderProps {
  profile: {
    user_id: string;
    username: string;
    display_name: string;
    email?: string | null;
    profile_picture: string | null;
    cover_picture: string | null;
    bio: string;
    country: string;
    points: number;
    ruby: number;
    diamonds: number;
    level: number;
    is_vip: boolean;
    vip_type: string | null;
    is_verified: boolean;
  };
  stats: {
    followers: number;
    following: number;
    friends: number;
  };
  isOwnProfile: boolean;
  onEdit: () => void;
  onMessage: () => void;
  onGift: () => void;
  onFollow: () => void;
}

const OWNER_EMAIL = 'njdj9985@gmail.com';

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  stats,
  isOwnProfile,
  onEdit,
  onMessage,
  onGift,
  onFollow,
}) => {
  const { t, lang } = useLanguage();
  const { user, isOwner } = useAuth();
  const { maxRole, roleInfo, permissions } = useUserRole(profile.user_id);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [localStats, setLocalStats] = useState(stats);

  const isProfileOwner = profile.email === OWNER_EMAIL || permissions.isOwner;

  useEffect(() => {
    if (user && !isOwnProfile) {
      checkFollowStatus();
    }
    setLocalStats(stats);
  }, [user, profile.user_id, stats]);

  const checkFollowStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.user_id)
      .maybeSingle();
    
    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!user) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.user_id);
        
        setIsFollowing(false);
        setLocalStats(prev => ({ ...prev, followers: prev.followers - 1 }));
        toast.success(lang === 'ar' ? 'تم إلغاء المتابعة' : 'Unfollowed');
      } else {
        // Follow
        await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: profile.user_id,
          });
        
        setIsFollowing(true);
        setLocalStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        toast.success(lang === 'ar' ? 'تمت المتابعة' : 'Following');
      }
    } catch (error) {
      console.error('Error following:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Cover Photo */}
      <div className="h-48 bg-gradient-to-br from-primary/30 to-secondary/30 relative">
        {profile.cover_picture && (
          <img
            src={profile.cover_picture}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Profile Info */}
      <div className="relative px-4 -mt-16">
        {/* Avatar */}
        <div className="relative inline-block">
          <div className={cn(
            "w-28 h-28 rounded-full border-4 border-background overflow-hidden",
            profile.is_vip && profile.vip_type === 'diamond' && "ring-2 ring-diamond ring-offset-2 ring-offset-background",
            profile.is_vip && profile.vip_type === 'gold' && "ring-2 ring-gold ring-offset-2 ring-offset-background",
            isProfileOwner && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}>
            {profile.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt={profile.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-primary-foreground text-3xl font-bold">
                {profile.display_name[0]}
              </div>
            )}
          </div>
          
          {/* Badges */}
          <div className="absolute -bottom-1 right-0 flex gap-1">
            {isProfileOwner && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg" title={lang === 'ar' ? 'مالك الموقع' : 'Site Owner'}>
                <Trophy className="w-4 h-4 text-white" />
              </div>
            )}
            {profile.is_verified && (
              <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-diamond" />
              </div>
            )}
            {profile.is_vip && (
              <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <Crown className={cn("w-5 h-5", profile.vip_type === 'diamond' ? 'text-diamond' : 'text-gold')} />
              </div>
            )}
          </div>
        </div>

        {/* Name & Username */}
        <div className="mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">
              {profile.display_name}
            </h1>
            {isProfileOwner && (
              <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-full flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {lang === 'ar' ? 'مالك الموقع' : 'Site Owner'}
              </span>
            )}
            <RoleBadge role={maxRole} size="sm" />
          </div>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-sm">{profile.bio}</p>
        )}

        {/* Location */}
        {profile.country && (
          <p className="mt-2 text-sm text-muted-foreground">
            📍 {profile.country}
          </p>
        )}

        {/* Level & Currency */}
        <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-gold font-bold">⭐ {t('level')} {profile.level}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gold">💰</span>
            <span>{profile.points.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-ruby">💎</span>
            <span>{profile.ruby}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-diamond">💠</span>
            <span>{profile.diamonds}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <button className="text-center">
            <p className="font-bold">{localStats.followers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('followers')}</p>
          </button>
          <button className="text-center">
            <p className="font-bold">{localStats.following.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('following')}</p>
          </button>
          <button className="text-center">
            <p className="font-bold">{localStats.friends.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('friends')}</p>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {isOwnProfile ? (
            <Button onClick={onEdit} variant="outline" className="flex-1 gap-2">
              <Edit className="w-4 h-4" />
              {t('editProfile')}
            </Button>
          ) : (
            <>
              <Button onClick={onMessage} variant="outline" className="flex-1 gap-2">
                <MessageCircle className="w-4 h-4" />
                {t('message')}
              </Button>
              <Button onClick={onGift} variant="outline" className="gap-2">
                <Gift className="w-4 h-4" />
              </Button>
              <Button 
                onClick={handleFollow} 
                disabled={followLoading}
                className={cn(
                  "gap-2",
                  isFollowing ? "bg-muted text-foreground hover:bg-muted/80" : "gradient-primary"
                )}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    {lang === 'ar' ? 'متابَع' : 'Following'}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {t('follow')}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
