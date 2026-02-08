import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Radio, MessageCircle, User, MessagesSquare, Hash } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const BottomNav: React.FC = () => {
  const { t, lang } = useLanguage();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/rooms', icon: MessagesSquare, label: lang === 'ar' ? 'الغرف' : 'Rooms' },
    { path: '/posts', icon: Hash, label: lang === 'ar' ? 'المنشورات' : 'Posts' },
    { path: '/live', icon: Radio, label: t('live'), special: true },
    { path: '/messages', icon: MessageCircle, label: t('messages') },
    { path: '/profile', icon: User, label: lang === 'ar' ? 'حسابي' : 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-dark border-t border-border/50">
      <div className="flex items-center justify-around h-14 px-1 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label, special }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
          
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200",
                special && "relative -top-2",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {special ? (
                <div className="w-10 h-10 gradient-live rounded-full flex items-center justify-center shadow-live live-pulse">
                  <Icon className="w-4 h-4 text-primary-foreground" />
                </div>
              ) : (
                <>
                  <Icon className={cn("w-4 h-4", isActive && "scale-110")} />
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
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
