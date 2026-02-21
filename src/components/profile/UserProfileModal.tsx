import React, { useState, useEffect } from 'react';
import { X, Gift, Send, Ban, EyeOff, Shield, Crown, Trophy, Star, MessageSquare, UserPlus, Edit, MoreVertical, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import RoleBadge from '@/components/common/RoleBadge';
import { UserRole, ROLE_HIERARCHY, getRoleLevel } from '@/hooks/useUserRole';
import JailUserModal from '@/components/rooms/JailUserModal';

interface UserProfile {
  user_id: string;
  display_name: string;
  username: string;
  profile_picture: string | null;
  cover_picture: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  level: number;
  points: number;
  is_vip: boolean;
  is_verified: boolean;
  is_banned: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserRole: number;
  isAppOwner: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentUserRole,
  isAppOwner,
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [targetRoleLevel, setTargetRoleLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showJailModal, setShowJailModal] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
      fetchUserRoles();
    }
  }, [isOpen, userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const roles = (data || []).map(r => r.role as UserRole);
      setUserRoles(roles);

      // Find max role level
      let maxLevel = 1;
      roles.forEach(role => {
        const level = getRoleLevel(role);
        if (level > maxLevel) maxLevel = level;
      });
      setTargetRoleLevel(maxLevel);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const canManageThisUser = currentUserRole > targetRoleLevel;
  const canEditProfile = isAppOwner; // Only owners can edit other profiles

  const handleAssignRole = async (role: UserRole) => {
    if (!canManageThisUser) {
      toast.error(lang === 'ar' ? 'لا يمكنك إدارة هذا المستخدم' : 'Cannot manage this user');
      return;
    }

    try {
      // Check if user already has this role
      const exists = userRoles.includes(role);
      
      if (exists) {
        // Remove role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        
        toast.success(lang === 'ar' ? 'تم إزالة الرتبة' : 'Role removed');
      } else {
        // Add role
        await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role,
            assigned_by: user?.id,
          });
        
        toast.success(lang === 'ar' ? 'تم إضافة الرتبة' : 'Role assigned');
      }

      fetchUserRoles();
    } catch (error) {
      console.error('Error managing role:', error);
      toast.error(lang === 'ar' ? 'فشلت العملية' : 'Operation failed');
    }
  };

  const handleBanUser = async (duration: string) => {
    if (!canManageThisUser) return;

    try {
      let banExpiresAt: string | null = null;
      
      if (duration !== 'permanent') {
        const now = new Date();
        switch (duration) {
          case '1h': now.setHours(now.getHours() + 1); break;
          case '24h': now.setHours(now.getHours() + 24); break;
          case '7d': now.setDate(now.getDate() + 7); break;
          case '30d': now.setDate(now.getDate() + 30); break;
        }
        banExpiresAt = now.toISOString();
      }

      await supabase
        .from('profiles')
        .update({ 
          is_banned: true,
          ban_reason: 'Banned by admin',
          ban_expires_at: banExpiresAt,
        })
        .eq('user_id', userId);

      toast.success(lang === 'ar' ? 'تم حظر المستخدم' : 'User banned');
      onClose();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error(lang === 'ar' ? 'فشل الحظر' : 'Ban failed');
    }
  };

  const handleIgnoreUser = async () => {
    // Implement ignore logic - store in local storage or database
    toast.success(lang === 'ar' ? 'تم تجاهل المستخدم' : 'User ignored');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profile ? (
          <>
            {/* Cover Image */}
            <div 
              className="h-32 bg-gradient-to-br from-primary/30 to-secondary/30"
              style={{
                backgroundImage: profile.cover_picture ? `url(${profile.cover_picture})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            {/* Profile Content */}
            <div className="px-4 pb-4 -mt-12">
              {/* Avatar and Actions */}
              <div className="flex items-end justify-between mb-4">
                <Avatar className="w-20 h-20 border-4 border-background">
                  <AvatarImage src={profile.profile_picture || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.display_name[0]}
                  </AvatarFallback>
                </Avatar>

                {!isOwnProfile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* Send Gift */}
                      <DropdownMenuItem>
                        <Gift className="w-4 h-4 mr-2" />
                        {lang === 'ar' ? 'إرسال هدية' : 'Send Gift'}
                      </DropdownMenuItem>

                      {/* Send Points */}
                      <DropdownMenuItem>
                        <Send className="w-4 h-4 mr-2" />
                        {lang === 'ar' ? 'تحويل نقاط' : 'Send Points'}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* Ignore */}
                      <DropdownMenuItem onClick={handleIgnoreUser}>
                        <EyeOff className="w-4 h-4 mr-2" />
                        {lang === 'ar' ? 'تجاهل' : 'Ignore'}
                      </DropdownMenuItem>

                      {/* Management Options - Only for higher ranks */}
                      {canManageThisUser && (
                        <>
                          <DropdownMenuSeparator />

                          {/* Edit Profile - Only for owners */}
                          {canEditProfile && (
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              {lang === 'ar' ? 'تعديل الملف' : 'Edit Profile'}
                            </DropdownMenuItem>
                          )}

                          {/* Role Management */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Crown className="w-4 h-4 mr-2" />
                              {lang === 'ar' ? 'الرتب' : 'Roles'}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {Object.entries(ROLE_HIERARCHY)
                                .filter(([_, info]) => info.level < currentUserRole && info.level > 1)
                                .map(([role, info]) => (
                                  <DropdownMenuItem
                                    key={role}
                                    onClick={() => handleAssignRole(role as UserRole)}
                                  >
                                    <span className="mr-2">{info.icon}</span>
                                    {lang === 'ar' ? info.name_ar : info.name_en}
                                    {userRoles.includes(role as UserRole) && (
                                      <span className="ml-auto text-primary">✓</span>
                                    )}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          {/* Jail Option - For owners and super admins */}
                          {(isAppOwner || currentUserRole >= 5) && (
                            <DropdownMenuItem 
                              onClick={() => setShowJailModal(true)}
                              className="text-amber-500"
                            >
                              <Lock className="w-4 h-4 mr-2" />
                              {lang === 'ar' ? 'إرسال للسجن' : 'Send to Jail'}
                            </DropdownMenuItem>
                          )}

                          {/* Ban Options */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-destructive">
                              <Ban className="w-4 h-4 mr-2" />
                              {lang === 'ar' ? 'حظر' : 'Ban'}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleBanUser('1h')}>
                                {lang === 'ar' ? 'ساعة واحدة' : '1 Hour'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBanUser('24h')}>
                                {lang === 'ar' ? '24 ساعة' : '24 Hours'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBanUser('7d')}>
                                {lang === 'ar' ? 'أسبوع' : '1 Week'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBanUser('30d')}>
                                {lang === 'ar' ? 'شهر' : '1 Month'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleBanUser('permanent')}
                                className="text-destructive"
                              >
                                {lang === 'ar' ? 'حظر دائم' : 'Permanent Ban'}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* User Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold">{profile.display_name}</h3>
                  {profile.is_verified && <Shield className="w-5 h-5 text-blue-500" />}
                  {profile.is_vip && <Star className="w-5 h-5 text-yellow-500" />}
                </div>

                <p className="text-muted-foreground">@{profile.username}</p>

                {/* Role Badges */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {userRoles.map(role => (
                    <RoleBadge key={role} role={role} size="sm" />
                  ))}
                </div>

                {profile.bio && (
                  <p className="text-sm mt-3">{profile.bio}</p>
                )}

                {/* Stats */}
                <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="font-bold">{profile.level}</p>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'المستوى' : 'Level'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{profile.points}</p>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'ar' ? 'النقاط' : 'Points'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1 gradient-primary">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {lang === 'ar' ? 'رسالة' : 'Message'}
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {lang === 'ar' ? 'متابعة' : 'Follow'}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            {lang === 'ar' ? 'لم يتم العثور على الملف' : 'Profile not found'}
          </div>
        )}
      </DialogContent>

      {/* Jail Modal */}
      <JailUserModal
        isOpen={showJailModal}
        onClose={() => setShowJailModal(false)}
        targetUserId={userId}
        targetUserName={profile?.display_name || ''}
      />
    </Dialog>
  );
};

export default UserProfileModal;
