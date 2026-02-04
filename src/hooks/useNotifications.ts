import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string | null;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      // Fetch all notifications (global + personal)
      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user's read status for global notifications
      const { data: reads } = await supabase
        .from('user_notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);

      const readIds = new Set((reads || []).map(r => r.notification_id));

      // Mark notifications as read/unread based on user's reads
      const processedNotifs = (notifs || []).map(n => ({
        ...n,
        is_read: n.user_id ? n.is_read : readIds.has(n.id),
      }));

      setNotifications(processedNotifs);
      setUnreadCount(processedNotifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    try {
      if (notification.user_id) {
        // Personal notification - update directly
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
      } else {
        // Global notification - add to reads
        await supabase
          .from('user_notification_reads')
          .insert({
            user_id: user.id,
            notification_id: notificationId,
          });
      }

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifs = notifications.filter(n => !n.is_read);
      
      for (const notif of unreadNotifs) {
        if (notif.user_id) {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notif.id);
        } else {
          await supabase
            .from('user_notification_reads')
            .upsert({
              user_id: user.id,
              notification_id: notif.id,
            });
        }
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Subscribe to new notifications
      const channel = supabase
        .channel('notifications_channel')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
};

export default useNotifications;
