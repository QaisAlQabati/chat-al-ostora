import React from 'react';
import { BadgeCheck, Crown, Edit, MessageCircle, Gift, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProfileHeaderProps {
  profile: {
    user_id: string;
    username: string;
    display_name: string;
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
            profile.is_vip && "ring-2 ring-gold ring-offset-2 ring-offset-background"
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
            {profile.is_verified && (
              <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-diamond" />
              </div>
            )}
            {profile.is_vip && (
              <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <Crown className="w-5 h-5 text-gold" />
              </div>
            )}
          </div>
        </div>

        {/* Name & Username */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {profile.display_name}
          </h1>
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
        <div className="flex items-center gap-4 mt-4 text-sm">
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
            <p className="font-bold">{stats.followers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('followers')}</p>
          </button>
          <button className="text-center">
            <p className="font-bold">{stats.following.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('following')}</p>
          </button>
          <button className="text-center">
            <p className="font-bold">{stats.friends.toLocaleString()}</p>
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
              <Button onClick={onFollow} className="gradient-primary gap-2">
                <UserPlus className="w-4 h-4" />
                {t('follow')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
