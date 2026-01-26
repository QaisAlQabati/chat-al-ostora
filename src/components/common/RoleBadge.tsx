import React from 'react';
import { UserRole, getRoleInfo, RoleInfo } from '@/hooks/useUserRole';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: UserRole;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ 
  role, 
  showName = true, 
  size = 'md',
  className 
}) => {
  const { lang } = useLanguage();
  const roleInfo = getRoleInfo(role);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Only show badge for VIP and above
  if (roleInfo.level < 2) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: `${roleInfo.color}20`,
        color: roleInfo.color,
        border: `1px solid ${roleInfo.color}40`
      }}
    >
      <span className={iconSizes[size]}>{roleInfo.icon}</span>
      {showName && (
        <span>{lang === 'ar' ? roleInfo.name_ar : roleInfo.name_en}</span>
      )}
    </span>
  );
};

export default RoleBadge;
