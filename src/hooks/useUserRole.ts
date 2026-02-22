import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'user' | 'vip' | 'royal_member' | 'moderator' | 'admin' | 'super_admin' | 'admin_level' | 'upper_admin' | 'crown_wing' | 'super_owner' | 'owner';

export interface RoleInfo {
  role: UserRole;
  level: number;
  name_ar: string;
  name_en: string;
  icon: string;
  color: string;
}

export const ROLE_HIERARCHY: Record<UserRole, RoleInfo> = {
  user: { role: 'user', level: 1, name_ar: 'عضو عادي', name_en: 'Regular Member', icon: '👤', color: '#94a3b8' },
  vip: { role: 'vip', level: 2, name_ar: 'عضو مميز', name_en: 'VIP Member', icon: '✨', color: '#fbbf24' },
  royal_member: { role: 'royal_member', level: 3, name_ar: 'عضو ملكي', name_en: 'Royal Member', icon: '💫', color: '#06b6d4' },
  moderator: { role: 'moderator', level: 4, name_ar: 'مشرف', name_en: 'Moderator', icon: '🛡️', color: '#3b82f6' },
  admin: { role: 'admin', level: 5, name_ar: 'أدمن', name_en: 'Admin', icon: '🔱', color: '#8b5cf6' },
  super_admin: { role: 'super_admin', level: 6, name_ar: 'سوبر أدمن', name_en: 'Super Admin', icon: '⚡', color: '#ec4899' },
  admin_level: { role: 'admin_level', level: 7, name_ar: 'الإدارة', name_en: 'Administration', icon: '⭐', color: '#f59e0b' },
  upper_admin: { role: 'upper_admin', level: 8, name_ar: 'الإدارة العليا', name_en: 'Upper Administration', icon: '👑', color: '#f59e0b' },
  crown_wing: { role: 'crown_wing', level: 9, name_ar: 'جناح الملوك', name_en: 'Crown Wing', icon: '⚜️', color: '#fbbf24' },
  super_owner: { role: 'super_owner', level: 10, name_ar: 'مالك الموقع', name_en: 'Site Owner', icon: '🏆', color: '#fbbf24' },
  owner: { role: 'owner', level: 10, name_ar: 'مالك الموقع', name_en: 'Site Owner', icon: '🏆', color: '#fbbf24' },
};

export const getRoleLevel = (role: UserRole): number => {
  return ROLE_HIERARCHY[role]?.level || 0;
};

export const getRoleInfo = (role: UserRole): RoleInfo => {
  return ROLE_HIERARCHY[role] || ROLE_HIERARCHY.user;
};

export const useUserRole = (userId?: string) => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [maxRole, setMaxRole] = useState<UserRole>('user');
  const [maxRoleLevel, setMaxRoleLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', targetUserId);

        if (error) throw error;

        const userRoles = (data || []).map(r => r.role as UserRole);
        setRoles(userRoles);

        // Find max role
        let max: UserRole = 'user';
        let maxLevel = 1;
        userRoles.forEach(role => {
          const level = getRoleLevel(role);
          if (level > maxLevel) {
            maxLevel = level;
            max = role;
          }
        });

        setMaxRole(max);
        setMaxRoleLevel(maxLevel);
      } catch (error) {
        console.error('Error fetching user roles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [targetUserId]);

  const hasRole = (role: UserRole): boolean => {
    return roles.includes(role);
  };

  const hasMinRole = (minRole: UserRole): boolean => {
    return maxRoleLevel >= getRoleLevel(minRole);
  };

  const canManageUser = (targetRoleLevel: number): boolean => {
    return maxRoleLevel > targetRoleLevel;
  };

  // Permission checks based on role
  const permissions = {
    canSendMedia: maxRoleLevel >= 2, // VIP+
    canMuteUsers: maxRoleLevel >= 3, // Moderator+
    canKickUsers: maxRoleLevel >= 3, // Moderator+
    canDeleteMessages: maxRoleLevel >= 3, // Moderator+
    canBanFromRoom: maxRoleLevel >= 4, // Admin+
    canManageRoom: maxRoleLevel >= 4, // Admin+
    canBanFromSite: maxRoleLevel >= 5, // Super Admin+
    canManageRoles: maxRoleLevel >= 5, // Super Admin+
    canManageEverything: maxRoleLevel >= 6, // Owner
    isOwner: maxRoleLevel >= 6,
  };

  return {
    roles,
    maxRole,
    maxRoleLevel,
    loading,
    hasRole,
    hasMinRole,
    canManageUser,
    permissions,
    roleInfo: getRoleInfo(maxRole),
  };
};

export default useUserRole;
