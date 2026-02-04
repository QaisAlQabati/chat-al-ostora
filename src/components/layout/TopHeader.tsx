import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bell, Shield, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import NotificationsModal from '@/components/notifications/NotificationsModal';

const TopHeader: React.FC = () => {
  const { t, lang, setLang } = useLanguage();
  const { profile, isOwner } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">L</span>
            </div>
            <h1 className="text-lg font-bold text-gradient">{t('appName')}</h1>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Globe className="w-5 h-5" />
            </Button>
            
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(true)}
              className="text-muted-foreground hover:text-foreground relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive rounded-full text-[10px] flex items-center justify-center text-destructive-foreground font-bold px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            
            {/* Admin (Owner Only) */}
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
                className="text-gold hover:text-gold/80"
              >
                <Shield className="w-5 h-5" />
              </Button>
            )}
            
            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
};

export default TopHeader;
