import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, Radio, MessageCircle, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const BottomNav: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/explore', icon: Compass, label: t('explore') },
    { path: '/live', icon: Radio, label: t('live'), special: true },
    { path: '/messages', icon: MessageCircle, label: t('messages') },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-dark border-t border-border/50">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label, special }) => {
          const isActive = location.pathname === path;
          
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
                special && "relative -top-3",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {special ? (
                <div className="w-14 h-14 gradient-live rounded-full flex items-center justify-center shadow-live live-pulse">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : (
                <>
                  <Icon className={cn("w-6 h-6", isActive && "scale-110")} />
                  <span className="text-xs font-medium">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
