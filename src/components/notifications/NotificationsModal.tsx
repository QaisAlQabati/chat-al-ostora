import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { lang } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </DialogTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-1" />
                {lang === 'ar' ? 'قراءة الكل' : 'Read All'}
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">
                {lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-3 rounded-lg transition-colors cursor-pointer",
                    notif.is_read ? "bg-muted/50" : "bg-primary/10 border-l-4 border-primary"
                  )}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">
                        {lang === 'ar' ? notif.title_ar : notif.title_en}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {lang === 'ar' ? notif.content_ar : notif.content_en}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: lang === 'ar' ? ar : enUS,
                        })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsModal;
