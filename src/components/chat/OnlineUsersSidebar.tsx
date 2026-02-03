import React, { useState, useEffect } from 'react';
import { X, Search, Users, UserPlus, Trophy, Crown, Shield, Star, Sparkles, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OnlineUser {
  user_id: string;
  display_name: string;
  profile_picture: string | null;
  is_vip: boolean;
  is_verified: boolean;
  level: number;
  country?: string;
  maxRole: string;
  roleLevel: number;
}

interface OnlineUsersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onMention: (name: string) => void;
  onOpenProfile: (userId: string) => void;
}

const ROLE_CONFIG = {
  owner: { level: 6, icon: Trophy, color: '#f59e0b', label: 'Owners', labelAr: 'المالكين' },
  super_owner: { level: 6, icon: Trophy, color: '#f59e0b', label: 'Owners', labelAr: 'المالكين' },
  super_admin: { level: 5, icon: Crown, color: '#ec4899', label: 'Super Admins', labelAr: 'الإدارة العليا' },
  admin: { level: 4, icon: Shield, color: '#8b5cf6', label: 'Admins', labelAr: 'الإدارة' },
  moderator: { level: 3, icon: Star, color: '#3b82f6', label: 'Moderators', labelAr: 'المشرفين' },
  vip: { level: 2, icon: Sparkles, color: '#fbbf24', label: 'VIP', labelAr: 'المميزين' },
  user: { level: 1, icon: User, color: '#94a3b8', label: 'Members', labelAr: 'الأعضاء' },
};

const OnlineUsersSidebar: React.FC<OnlineUsersSidebarProps> = ({
  isOpen,
  onClose,
  roomId,
  onMention,
  onOpenProfile,
}) => {
  const { lang } = useLanguage();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFriends, setShowFriends] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchOnlineUsers();
    }
  }, [isOpen, roomId]);

  const fetchOnlineUsers = async () => {
    setLoading(true);
    try {
      // Fetch room members
      const { data: members, error } = await supabase
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('is_banned', false);

      if (error) throw error;

      // Fetch profiles and roles for each member
      const usersWithRoles = await Promise.all(
        (members || []).map(async (member) => {
          // Get profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, profile_picture, is_vip, is_verified, level, country')
            .eq('user_id', member.user_id)
            .single();

          // Get roles
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', member.user_id);

          // Find max role level
          let maxRole = 'user';
          let roleLevel = 1;
          (roles || []).forEach((r) => {
            const config = ROLE_CONFIG[r.role as keyof typeof ROLE_CONFIG];
            if (config && config.level > roleLevel) {
              roleLevel = config.level;
              maxRole = r.role;
            }
          });

          return {
            user_id: member.user_id,
            display_name: profile?.display_name || 'Unknown',
            profile_picture: profile?.profile_picture,
            is_vip: profile?.is_vip || false,
            is_verified: profile?.is_verified || false,
            level: profile?.level || 1,
            country: profile?.country,
            maxRole,
            roleLevel,
          };
        })
      );

      // Sort by role level (highest first)
      usersWithRoles.sort((a, b) => b.roleLevel - a.roleLevel);
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching online users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group users by role
  const groupedUsers = users.reduce((acc, user) => {
    const roleKey = user.roleLevel >= 6 ? 'owner' : user.maxRole;
    if (!acc[roleKey]) {
      acc[roleKey] = [];
    }
    acc[roleKey].push(user);
    return acc;
  }, {} as Record<string, OnlineUser[]>);

  // Filter users by search
  const filteredGroups = Object.entries(groupedUsers).reduce((acc, [role, users]) => {
    const filtered = users.filter(u => 
      u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[role] = filtered;
    }
    return acc;
  }, {} as Record<string, OnlineUser[]>);

  // Role order for display
  const roleOrder = ['owner', 'super_owner', 'super_admin', 'admin', 'moderator', 'vip', 'user'];

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] glass-dark border-l border-border/50 z-50 animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between p-3 border-b border-border/50 bg-gradient-to-r from-primary/20 to-secondary/20">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-semibold">
            {lang === 'ar' ? `متصلين الآن ${users.length}` : `Online Now ${users.length}`}
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Toggle: Online / Friends */}
      <div className="flex gap-2 p-3 border-b border-border/50">
        <Button
          variant={!showFriends ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setShowFriends(false)}
        >
          <Users className="w-4 h-4 mr-1" />
          {lang === 'ar' ? 'المتواجدين' : 'Online'}
        </Button>
        <Button
          variant={showFriends ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setShowFriends(true)}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          {lang === 'ar' ? 'الأصدقاء' : 'Friends'}
        </Button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Users List */}
      <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-2 pb-4 space-y-3">
            {roleOrder.map((role) => {
              const usersInRole = filteredGroups[role];
              if (!usersInRole || usersInRole.length === 0) return null;

              const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.user;
              const Icon = config.icon;

              return (
                <div key={role}>
                  {/* Role Header */}
                  <div 
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                    <span 
                      className="text-sm font-semibold"
                      style={{ color: config.color }}
                    >
                      {lang === 'ar' ? config.labelAr : config.label}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      ({usersInRole.length})
                    </span>
                  </div>

                  {/* Users in this role */}
                  <div className="space-y-1">
                    {usersInRole.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        {/* Country flag placeholder */}
                        <span className="text-sm">🇸🇦</span>

                        {/* Role icon */}
                        <Icon className="w-4 h-4" style={{ color: config.color }} />

                        {/* Avatar */}
                        <Avatar 
                          className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary"
                          onClick={() => onOpenProfile(user.user_id)}
                        >
                          <AvatarImage src={user.profile_picture || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.display_name[0]}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name - click to mention */}
                        <span 
                          className="flex-1 text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors"
                          onClick={() => onMention(user.display_name)}
                        >
                          {user.display_name}
                        </span>

                        {/* VIP badge */}
                        {user.is_vip && (
                          <Star className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {Object.keys(filteredGroups).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery 
                  ? (lang === 'ar' ? 'لا توجد نتائج' : 'No results')
                  : (lang === 'ar' ? 'لا يوجد متصلين' : 'No online users')}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default OnlineUsersSidebar;
