import React, { useState, useEffect } from 'react';
import { X, Gift, Send, Ban, EyeOff, Eye, Shield, Crown, Trophy, Star, MessageSquare, UserPlus, Edit, MoreVertical, Lock, Mic, MicOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

// ====== أضف هنا معرّف المالك الأصلي ======
// افتح Supabase > Authentication > Users وانسخ الـ UUID الخاص بك
const APP_OWNER_ID = 'YOUR_OWNER_UUID_HERE'; // <-- غيّر هذا بمعرّفك الحقيقي

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

interface RoomRole {
  id: string;
  role: string;
  room_id: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserRole: number;
  isAppOwner: boolean;
  roomId?: string; // اختياري — إذا كنت داخل غرفة
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentUserRole,
  isAppOwner: isAppOwnerProp,
  roomId,
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [roomRoles, setRoomRoles] = useState<RoomRole[]>([]);
  const [targetRoleLevel, setTargetRoleLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showJailModal, setShowJailModal] = useState(false);
  const [isIgnored, setIsIgnored] = useState(false);

  // ====== الإصلاح الحاسم: تحقق من الـ UUID مباشرة ======
  // هذا يضمن أنك أنت المالك حتى لو isAppOwnerProp جاء false
  const isRealOwner = user?.id === APP_OWNER_ID || isAppOwnerProp;
  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
      fetchUserRoles();
      if (roomId) fetchRoomRoles();
      checkIfIgnored();
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

  // ====== جلب رتب الغرفة ======
  const fetchRoomRoles = async () => {
    if (!roomId) return;
    try {
      const { data } = await supabase
        .from('room_roles') // تأكد من اسم الجدول في قاعدة بياناتك
        .select('id, role, room_id')
        .eq('user_id', userId)
        .eq('room_id', roomId);
      setRoomRoles(data || []);
    } catch (error) {
      console.error('Error fetching room roles:', error);
    }
  };

  // ====== فحص حالة التجاهل ======
  const checkIfIgnored = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('ignored_users') // تأكد من اسم الجدول
        .select('id')
        .eq('user_id', user.id)
        .eq('ignored_user_id', userId)
        .single();
      setIsIgnored(!!data);
    } catch {
      setIsIgnored(false);
    }
  };

  const effectiveCurrentRole = isRealOwner ? 99 : currentUserRole;
  const canManageThisUser = !isOwnProfile && (isRealOwner || effectiveCurrentRole > targetRoleLevel);
  const canEditProfile = isRealOwner;
  const canJail = isRealOwner || effectiveCurrentRole >= 5;
  const canBan = isRealOwner || effectiveCurrentRole >= 3;

  const handleAssignRole = async (role: UserRole) => {
    try {
      const exists = userRoles.includes(role);
      if (exists) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        toast.success('تم إزالة الرتبة');
      } else {
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role, assigned_by: user?.id });
        toast.success('تم إضافة الرتبة');
      }
      fetchUserRoles();
    } catch (error) {
      console.error('Error managing role:', error);
      toast.error('فشلت العملية');
    }
  };

  // ====== سحب رتبة الغرفة ======
  const handleRemoveRoomRole = async (roomRoleId: string, roleName: string) => {
    try {
      const { error } = await supabase
        .from('room_roles')
        .delete()
        .eq('id', roomRoleId);
      if (error) throw error;
      toast.success(`تم سحب رتبة "${roleName}" من الغرفة`);
      fetchRoomRoles();
    } catch (error) {
      console.error('Error removing room role:', error);
      toast.error('فشل سحب رتبة الغرفة');
    }
  };

  const handleBanUser = async (duration: string) => {
    try {
      let banExpiresAt: string | null = null;
      if (duration !== 'permanent') {
        const now = new Date();
        switch (duration) {
          case '1h':  now.setHours(now.getHours() + 1); break;
          case '24h': now.setHours(now.getHours() + 24); break;
          case '7d':  now.setDate(now.getDate() + 7); break;
          case '30d': now.setDate(now.getDate() + 30); break;
        }
        banExpiresAt = now.toISOString();
      }
      await supabase
        .from('profiles')
        .update({ is_banned: true, ban_reason: 'Banned by admin', ban_expires_at: banExpiresAt })
        .eq('user_id', userId);
      toast.success('تم حظر المستخدم');
      onClose();
    } catch (error) {
      toast.error('فشل الحظر');
    }
  };

  // ====== تجاهل / إلغاء تجاهل ======
  const handleToggleIgnore = async () => {
    if (!user?.id) return;
    try {
      if (isIgnored) {
        // إلغاء التجاهل
        await supabase
          .from('ignored_users')
          .delete()
          .eq('user_id', user.id)
          .eq('ignored_user_id', userId);
        setIsIgnored(false);
        toast.success('تم إلغاء تجاهل المستخدم');
      } else {
        // تجاهل
        await supabase
          .from('ignored_users')
          .insert({ user_id: user.id, ignored_user_id: userId });
        setIsIgnored(true);
        toast.success('تم تجاهل المستخدم');
      }
    } catch (error) {
      console.error('Error toggling ignore:', error);
      toast.error('فشلت العملية');
    }
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
                  <AvatarFallback className="text-2xl">{profile.display_name[0]}</AvatarFallback>
                </Avatar>

                {!isOwnProfile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">

                      {/* إرسال هدية */}
                      <DropdownMenuItem>
                        <Gift className="w-4 h-4 mr-2" />
                        إرسال هدية
                      </DropdownMenuItem>

                      {/* تحويل نقاط */}
                      <DropdownMenuItem>
                        <Send className="w-4 h-4 mr-2" />
                        تحويل نقاط
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* ====== تجاهل / إلغاء تجاهل ====== */}
                      <DropdownMenuItem onClick={handleToggleIgnore}>
                        {isIgnored ? (
                          <>
                            <Eye className="w-4 h-4 mr-2 text-green-500" />
                            <span className="text-green-500">إلغاء التجاهل</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            تجاهل
                          </>
                        )}
                      </DropdownMenuItem>

                      {/* ====== خيارات الإدارة ====== */}
                      {canManageThisUser && (
                        <>
                          <DropdownMenuSeparator />

                          {/* تعديل الملف — المالك فقط */}
                          {canEditProfile && (
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              تعديل الملف
                            </DropdownMenuItem>
                          )}

                          {/* رتب الموقع */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Crown className="w-4 h-4 mr-2" />
                              رتب الموقع
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {Object.entries(ROLE_HIERARCHY)
                                .filter(([_, info]) => info.level < effectiveCurrentRole && info.level > 1)
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

                          {/* ====== سحب رتبة الغرفة ====== */}
                          {roomId && roomRoles.length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-amber-500">
                                <MicOff className="w-4 h-4 mr-2" />
                                سحب رتبة الغرفة
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {roomRoles.map((rr) => (
                                  <DropdownMenuItem
                                    key={rr.id}
                                    onClick={() => handleRemoveRoomRole(rr.id, rr.role)}
                                    className="text-amber-500"
                                  >
                                    <MicOff className="w-4 h-4 mr-2" />
                                    سحب "{rr.role}"
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}

                          {/* إرسال للسجن */}
                          {canJail && (
                            <DropdownMenuItem
                              onClick={() => setShowJailModal(true)}
                              className="text-amber-500"
                            >
                              <Lock className="w-4 h-4 mr-2" />
                              إرسال للسجن
                            </DropdownMenuItem>
                          )}

                          {/* حظر */}
                          {canBan && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-destructive">
                                <Ban className="w-4 h-4 mr-2" />
                                حظر
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleBanUser('1h')}>ساعة واحدة</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBanUser('24h')}>24 ساعة</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBanUser('7d')}>أسبوع</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBanUser('30d')}>شهر</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleBanUser('permanent')} className="text-destructive">
                                  حظر دائم
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
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
                  {profile.is_banned && (
                    <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">محظور</span>
                  )}
                  {/* ====== شارة المالك ====== */}
                  {isRealOwner && isOwnProfile && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-bold">
                      👑 المالك
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground text-sm">@{profile.username}</p>

                {/* Role Badges */}
                {userRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {userRoles.map(role => (
                      <RoleBadge key={role} role={role} size="sm" />
                    ))}
                  </div>
                )}

                {/* Room Role Badges */}
                {roomRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {roomRoles.map(rr => (
                      <span key={rr.id} className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">
                        🎙️ {rr.role}
                      </span>
                    ))}
                  </div>
                )}

                {profile.bio && <p className="text-sm mt-3">{profile.bio}</p>}

                {/* Stats */}
                <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="font-bold">{profile.level}</p>
                    <p className="text-xs text-muted-foreground">المستوى</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{profile.points?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">النقاط</p>
                  </div>
                  {profile.country && (
                    <div className="text-center">
                      <p className="font-bold">{profile.country}</p>
                      <p className="text-xs text-muted-foreground">الدولة</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1 gradient-primary">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    رسالة
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <UserPlus className="w-4 h-4 mr-2" />
                    متابعة
                  </Button>
                </div>
              )}

              {/* Debug — أزله بعد التأكد */}
              <p className="text-[10px] text-white/20 mt-2">
                isRealOwner: {String(isRealOwner)} | role: {effectiveCurrentRole} | target: {targetRoleLevel} | canManage: {String(canManageThisUser)} | ignored: {String(isIgnored)}
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">لم يتم العثور على الملف</div>
        )}
      </DialogContent>

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
