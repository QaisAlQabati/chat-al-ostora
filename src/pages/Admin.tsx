import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Radio, MessageCircle, Gift, Shield, 
  TrendingUp, Search, ChevronLeft, Crown, BadgeCheck,
  MoreVertical, Ban, Coins, Award, Trash2, Edit, Bell,
  Send, Gem, CircleDollarSign, Diamond, Plus, UserCog, X,
  MapPin, Smartphone, Wifi, Monitor, Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import RoleBadge from '@/components/common/RoleBadge';
import { UserRole, ROLE_HIERARCHY } from '@/hooks/useUserRole';

const ORIGINAL_OWNER_EMAIL = 'njdj9985@gmail.com';

// قائمة الرتب الكاملة بالترتيب
const ROLES_LIST = [
  { key: 'owner',        label: 'مالك',         icon: '🏆' },
  { key: 'super_owner',  label: 'جناح الملوك',   icon: '⚜️' },
  { key: 'super_admin',  label: 'إدارة عليا',    icon: '👑' },
  { key: 'admin',        label: 'إدارة',         icon: '⭐' },
  { key: 'moderator',    label: 'مشرف',          icon: '🛡️' },
  { key: 'vip',          label: 'عضو مميز',      icon: '💫' },
];

interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  activeLives: number;
  todayStories: number;
  totalMessages: number;
  totalGifts: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  email: string | null;
  profile_picture: string | null;
  country: string;
  level: number;
  points: number;
  ruby: number;
  diamonds: number;
  is_verified: boolean;
  is_vip: boolean;
  vip_type: string | null;
  is_banned: boolean;
  status: string;
  bio: string;
  created_at: string;
  currentRole?: string; // الرتبة الحالية للمستخدم
  // معلومات الجهاز والموقع (تُحفظ في جدول user_sessions أو user_devices)
  last_ip?: string;
  last_device_info?: string;
  last_location?: string;
  last_seen_at?: string;
}

// نافذة معلومات الموقع الجغرافي
interface LocationModalData {
  userId: string;
  userName: string;
  lat?: number;
  lng?: number;
  city?: string;
  country?: string;
  ip?: string;
  loading: boolean;
  error?: string;
}

// نافذة معلومات الجهاز
interface DeviceModalData {
  userId: string;
  userName: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  network?: string;
  userAgent?: string;
  screenSize?: string;
  localTime?: string;
  ip?: string;
  loading: boolean;
  error?: string;
}

const Admin: React.FC = () => {
  const { lang } = useLanguage();
  const { user, isOwner, loading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    onlineUsers: 0,
    activeLives: 0,
    todayStories: 0,
    totalMessages: 0,
    totalGifts: 0,
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    username: '',
    bio: '',
    country: '',
    level: 0,
    points: 0,
    ruby: 0,
    diamonds: 0,
    is_verified: false,
    is_vip: false,
    vip_type: '',
  });

  const [sendingCurrency, setSendingCurrency] = useState<{userId: string; userName: string} | null>(null);
  const [currencyForm, setCurrencyForm] = useState({
    type: 'points' as 'points' | 'ruby' | 'diamonds',
    amount: 0,
  });

  const [showNotification, setShowNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title_ar: '',
    title_en: '',
    content_ar: '',
    content_en: '',
    target_audience: 'everyone',
  });

  // ====== حالات نوافذ الموقع والجهاز ======
  const [locationModal, setLocationModal] = useState<LocationModalData | null>(null);
  const [deviceModal, setDeviceModal] = useState<DeviceModalData | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isOwner)) {
      navigate('/');
      toast.error(lang === 'ar' ? 'غير مصرح' : 'Unauthorized');
    }
  }, [loading, user, isOwner, navigate]);

  useEffect(() => {
    if (isOwner) {
      fetchStats();
      fetchUsers();
    }
  }, [isOwner]);

  const fetchStats = async () => {
    try {
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: onlineUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'online');
      const { count: activeLives } = await supabase.from('personal_lives').select('*', { count: 'exact', head: true }).eq('is_live', true);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { count: todayStories } = await supabase.from('stories').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());
      const { count: totalMessages } = await supabase.from('messages').select('*', { count: 'exact', head: true });
      const { count: totalGifts } = await supabase.from('sent_gifts').select('*', { count: 'exact', head: true });
      setStats({
        totalUsers: totalUsers || 0, onlineUsers: onlineUsers || 0,
        activeLives: activeLives || 0, todayStories: todayStories || 0,
        totalMessages: totalMessages || 0, totalGifts: totalGifts || 0,
      });
    } catch (error) { console.error('Error fetching stats:', error); }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;

      // جلب رتبة كل مستخدم (أعلى رتبة)
      const usersWithRoles = await Promise.all((data || []).map(async (profile) => {
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', profile.user_id);
        let currentRole = '';
        let maxLevel = 0;
        (roles || []).forEach((r: any) => {
          const idx = ROLES_LIST.findIndex(rl => rl.key === r.role);
          // كلما كان الـ index أصغر كلما كانت الرتبة أعلى
          if (idx !== -1 && (maxLevel === 0 || idx < maxLevel)) {
            maxLevel = idx + 1;
            currentRole = r.role;
          }
        });
        return { ...profile, currentRole };
      }));

      setUsers(usersWithRoles);
    } catch (error) { console.error('Error fetching users:', error); }
    finally { setLoadingData(false); }
  };

  // تحديث مستخدم واحد في الـ state — بدون reload للقائمة كلها
  const updateUserInState = (userId: string, updates: Partial<UserProfile>) => {
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, ...updates } : u));
  };

  const isOriginalOwner = (profile: UserProfile) => profile.email === ORIGINAL_OWNER_EMAIL;

  // ====== تعيين الرتبة — يحذف القديمة ويضيف الجديدة (رتبة واحدة فقط) ======
  const handleSetRole = async (userId: string, newRole: string) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser && isOriginalOwner(targetUser)) {
      toast.error('لا يمكن تغيير رتبة المالك الأصلي');
      return;
    }

    try {
      // 1. احذف كل الرتب القديمة للمستخدم
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // 2. أضف الرتبة الجديدة
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: newRole,
        assigned_by: user?.id,
      });
      if (error) throw error;

      // 3. تحديث الـ state مباشرة — التغيير يظهر عند المستخدم فقط
      updateUserInState(userId, { currentRole: newRole });

      const roleInfo = ROLES_LIST.find(r => r.key === newRole);
      toast.success(`تم تغيير الرتبة إلى ${roleInfo?.icon} ${roleInfo?.label}`);
    } catch (error) {
      console.error('Error setting role:', error);
      toast.error('فشل تغيير الرتبة');
    }
  };

  // ====== سحب الرتبة — زر واحد يمسح كل الرتب ======
  const handleRemoveRole = async (userId: string) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser && isOriginalOwner(targetUser)) {
      toast.error('لا يمكن سحب رتبة المالك الأصلي');
      return;
    }

    try {
      // احذف كل رتب هذا المستخدم
      await supabase.from('user_roles').delete().eq('user_id', userId);
      // تحديث الـ state — التغيير يظهر عنده فقط
      updateUserInState(userId, { currentRole: '' });
      toast.success('تم سحب الرتبة — أصبح عضو عادي');
    } catch (error) {
      toast.error('فشل سحب الرتبة');
    }
  };

  const handleEditUser = (profile: UserProfile) => {
    setEditingUser(profile);
    setEditForm({
      display_name: profile.display_name,
      username: profile.username,
      bio: profile.bio || '',
      country: profile.country || '',
      level: profile.level,
      points: profile.points,
      ruby: profile.ruby,
      diamonds: profile.diamonds || 0,
      is_verified: profile.is_verified,
      is_vip: profile.is_vip,
      vip_type: profile.vip_type || '',
    });
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;
    try {
      const updatePayload = {
        display_name: editForm.display_name,
        username: editForm.username,
        bio: editForm.bio,
        country: editForm.country,
        level: editForm.level,
        points: editForm.points,
        ruby: editForm.ruby,
        diamonds: editForm.diamonds,
        is_verified: editForm.is_verified,
        is_vip: editForm.is_vip,
        vip_type: editForm.is_vip ? (editForm.vip_type as 'gold' | 'diamond') : null,
      };
      const { error } = await supabase.from('profiles').update(updatePayload).eq('user_id', editingUser.user_id);
      if (error) throw error;
      toast.success(lang === 'ar' ? 'تم حفظ التغييرات' : 'Changes saved');
      updateUserInState(editingUser.user_id, updatePayload);
      setEditingUser(null);
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes');
    }
  };

  const handleSendCurrency = async () => {
    if (!sendingCurrency || currencyForm.amount <= 0) return;
    try {
      const profile = users.find(u => u.user_id === sendingCurrency.userId);
      if (!profile) return;
      const updateData: any = {};
      if (currencyForm.type === 'points') updateData.points = profile.points + currencyForm.amount;
      else if (currencyForm.type === 'ruby') updateData.ruby = profile.ruby + currencyForm.amount;
      else if (currencyForm.type === 'diamonds') updateData.diamonds = (profile.diamonds || 0) + currencyForm.amount;
      const { error } = await supabase.from('profiles').update(updateData).eq('user_id', sendingCurrency.userId);
      if (error) throw error;
      await supabase.from('transactions').insert({
        user_id: sendingCurrency.userId,
        transaction_type: 'admin_gift',
        currency: currencyForm.type,
        amount: currencyForm.amount,
        balance_after: updateData[currencyForm.type],
        description: `Gift from admin: ${currencyForm.amount} ${currencyForm.type}`,
      });
      toast.success(lang === 'ar' ? `تم إرسال ${currencyForm.amount} ${currencyForm.type === 'points' ? 'نقطة' : currencyForm.type === 'ruby' ? 'روبي' : 'ماسة'}` : `Sent ${currencyForm.amount} ${currencyForm.type}`);
      updateUserInState(sendingCurrency.userId, updateData);
      setSendingCurrency(null);
      setCurrencyForm({ type: 'points', amount: 0 });
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الإرسال' : 'Failed to send');
    }
  };

  const handleSendNotification = async () => {
    try {
      const { error } = await supabase.from('notifications').insert({
        title_ar: notificationForm.title_ar,
        title_en: notificationForm.title_en,
        content_ar: notificationForm.content_ar,
        content_en: notificationForm.content_en,
        type: 'global',
        user_id: null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success(lang === 'ar' ? 'تم إرسال الإشعار للجميع' : 'Notification sent to everyone');
      setShowNotification(false);
      setNotificationForm({ title_ar: '', title_en: '', content_ar: '', content_en: '', target_audience: 'everyone' });
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل إرسال الإشعار' : 'Failed to send notification');
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser && isOriginalOwner(targetUser)) { toast.error('لا يمكن حظر المالك الأصلي'); return; }
    try {
      const { error } = await supabase.from('profiles').update({ is_banned: ban, ban_reason: ban ? 'Banned by admin' : null }).eq('user_id', userId);
      if (error) throw error;
      updateUserInState(userId, { is_banned: ban });
      toast.success(ban ? (lang === 'ar' ? 'تم حظر المستخدم' : 'User banned') : (lang === 'ar' ? 'تم إلغاء الحظر' : 'User unbanned'));
    } catch (error) { console.error(error); }
  };

  const handleVerifyUser = async (userId: string, verify: boolean) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_verified: verify }).eq('user_id', userId);
      if (error) throw error;
      updateUserInState(userId, { is_verified: verify });
      toast.success(verify ? (lang === 'ar' ? 'تم توثيق الحساب' : 'Account verified') : (lang === 'ar' ? 'تم إلغاء التوثيق' : 'Verification removed'));
    } catch (error) { console.error(error); }
  };

  const handleSetVIP = async (userId: string, vip: boolean, vipType: 'gold' | 'diamond' | null) => {
    try {
      const updateData = { is_vip: vip, vip_type: vipType, vip_expires_at: vip ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null };
      const { error } = await supabase.from('profiles').update(updateData).eq('user_id', userId);
      if (error) throw error;
      updateUserInState(userId, updateData);
      toast.success(vip ? (lang === 'ar' ? `تم ترقية إلى VIP ${vipType}` : `Upgraded to VIP ${vipType}`) : (lang === 'ar' ? 'تم إلغاء VIP' : 'VIP removed'));
    } catch (error) { console.error(error); }
  };

  // ====== فتح نافذة موقع المستخدم ======
  const handleShowLocation = async (profile: UserProfile) => {
    setLocationModal({
      userId: profile.user_id,
      userName: profile.display_name,
      loading: true,
    });

    try {
      // جلب آخر جلسة للمستخدم من جدول user_sessions أو user_devices
      const { data: sessionData } = await supabase
        .from('user_sessions')
        .select('ip_address, location_lat, location_lng, location_city, location_country, created_at')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionData && (sessionData.location_lat || sessionData.ip_address)) {
        setLocationModal({
          userId: profile.user_id,
          userName: profile.display_name,
          lat: sessionData.location_lat || undefined,
          lng: sessionData.location_lng || undefined,
          city: sessionData.location_city || undefined,
          country: sessionData.location_country || undefined,
          ip: sessionData.ip_address || undefined,
          loading: false,
        });
      } else {
        // إذا لم يكن هناك جدول أو بيانات، نحاول جلب الموقع عبر IP API عام
        // (هذا مثال — في الواقع تحتاج IP من السيرفر)
        setLocationModal({
          userId: profile.user_id,
          userName: profile.display_name,
          loading: false,
          error: 'لا توجد بيانات موقع محفوظة لهذا المستخدم. يجب حفظ بيانات الجلسة عند تسجيل الدخول.',
        });
      }
    } catch (err) {
      setLocationModal({
        userId: profile.user_id,
        userName: profile.display_name,
        loading: false,
        error: 'لا توجد بيانات موقع محفوظة لهذا المستخدم.',
      });
    }
  };

  // ====== فتح نافذة معلومات الجهاز ======
  const handleShowDevice = async (profile: UserProfile) => {
    setDeviceModal({
      userId: profile.user_id,
      userName: profile.display_name,
      loading: true,
    });

    try {
      const { data: sessionData } = await supabase
        .from('user_sessions')
        .select('ip_address, user_agent, device_type, os, browser, network_type, screen_size, local_time, created_at')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionData) {
        setDeviceModal({
          userId: profile.user_id,
          userName: profile.display_name,
          deviceType: sessionData.device_type || parseDeviceType(sessionData.user_agent),
          os: sessionData.os || parseOS(sessionData.user_agent),
          browser: sessionData.browser || parseBrowser(sessionData.user_agent),
          network: sessionData.network_type || 'غير معروف',
          userAgent: sessionData.user_agent || undefined,
          screenSize: sessionData.screen_size || undefined,
          localTime: sessionData.local_time || undefined,
          ip: sessionData.ip_address || undefined,
          loading: false,
        });
      } else {
        setDeviceModal({
          userId: profile.user_id,
          userName: profile.display_name,
          loading: false,
          error: 'لا توجد بيانات جهاز محفوظة لهذا المستخدم. يجب حفظ بيانات الجلسة عند تسجيل الدخول.',
        });
      }
    } catch (err) {
      setDeviceModal({
        userId: profile.user_id,
        userName: profile.display_name,
        loading: false,
        error: 'لا توجد بيانات جهاز محفوظة لهذا المستخدم.',
      });
    }
  };

  // دوال مساعدة لتحليل user_agent
  const parseDeviceType = (ua?: string): string => {
    if (!ua) return 'غير معروف';
    if (/mobile/i.test(ua)) return '📱 هاتف محمول';
    if (/tablet|ipad/i.test(ua)) return '📟 تابلت';
    return '💻 كمبيوتر';
  };

  const parseOS = (ua?: string): string => {
    if (!ua) return 'غير معروف';
    if (/windows nt 10/i.test(ua)) return 'Windows 10/11';
    if (/windows nt 6.3/i.test(ua)) return 'Windows 8.1';
    if (/windows nt 6.1/i.test(ua)) return 'Windows 7';
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac os x/i.test(ua)) return 'macOS';
    if (/iphone os/i.test(ua)) {
      const match = ua.match(/iphone os ([\d_]+)/i);
      return `iOS ${match ? match[1].replace(/_/g, '.') : ''}`;
    }
    if (/android/i.test(ua)) {
      const match = ua.match(/android ([\d.]+)/i);
      return `Android ${match ? match[1] : ''}`;
    }
    if (/linux/i.test(ua)) return 'Linux';
    return 'غير معروف';
  };

  const parseBrowser = (ua?: string): string => {
    if (!ua) return 'غير معروف';
    if (/edg\//i.test(ua)) return 'Microsoft Edge';
    if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
    if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return 'Google Chrome';
    if (/firefox/i.test(ua)) return 'Mozilla Firefox';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
    if (/samsung/i.test(ua)) return 'Samsung Browser';
    return 'غير معروف';
  };

  const filteredUsers = users.filter(u =>
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 glass-dark border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ChevronLeft className="w-6 h-6" /></Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold" />
              <h1 className="font-bold">{lang === 'ar' ? 'لوحة المالك' : 'Owner Panel'}</h1>
            </div>
          </div>
          <Button onClick={() => setShowNotification(true)} className="gradient-primary gap-2" size="sm">
            <Bell className="w-4 h-4" />{lang === 'ar' ? 'إشعار' : 'Notify'}
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: lang === 'ar' ? 'إجمالي المستخدمين' : 'Total Users', value: stats.totalUsers, icon: <Users className="w-5 h-5 text-primary" />, bg: 'bg-primary/20' },
            { label: lang === 'ar' ? 'متصل الآن' : 'Online Now', value: stats.onlineUsers, icon: <TrendingUp className="w-5 h-5 text-status-online" />, bg: 'bg-status-online/20' },
            { label: lang === 'ar' ? 'لايف نشط' : 'Active Lives', value: stats.activeLives, icon: <Radio className="w-5 h-5 text-status-live" />, bg: 'bg-status-live/20' },
            { label: lang === 'ar' ? 'الرسائل' : 'Messages', value: stats.totalMessages, icon: <MessageCircle className="w-5 h-5 text-secondary" />, bg: 'bg-secondary/20' },
            { label: lang === 'ar' ? 'الهدايا' : 'Gifts', value: stats.totalGifts, icon: <Gift className="w-5 h-5 text-gold" />, bg: 'bg-gold/20' },
            { label: lang === 'ar' ? 'استوريات اليوم' : 'Today Stories', value: stats.todayStories, icon: <Award className="w-5 h-5 text-accent" />, bg: 'bg-accent/20' },
          ].map((s, i) => (
            <Card key={i} className="gradient-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>{s.icon}</div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {lang === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={lang === 'ar' ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                filteredUsers.map((profile) => {
                  const isProtected = isOriginalOwner(profile);
                  const roleInfo = ROLES_LIST.find(r => r.key === profile.currentRole);

                  return (
                    <div
                      key={profile.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors",
                        profile.is_banned && "opacity-50",
                        isProtected && "border border-yellow-500/30 bg-yellow-500/5"
                      )}
                    >
                      <div
                        className="w-12 h-12 rounded-full overflow-hidden bg-muted cursor-pointer flex-shrink-0"
                        onClick={() => navigate(`/profile/${profile.user_id}`)}
                      >
                        {profile.profile_picture ? (
                          <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-bold">
                            {profile.display_name?.[0]}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{profile.display_name}</span>
                          {isProtected && <span className="text-xs text-yellow-500 font-bold">🏆 مالك أصلي</span>}
                          {/* شارة الرتبة الحالية */}
                          {roleInfo && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 font-bold">
                              {roleInfo.icon} {roleInfo.label}
                            </span>
                          )}
                          {profile.is_verified && <BadgeCheck className="w-4 h-4 text-diamond flex-shrink-0" />}
                          {profile.is_vip && <Crown className={cn("w-4 h-4 flex-shrink-0", profile.vip_type === 'diamond' ? 'text-diamond' : 'text-gold')} />}
                          {profile.is_banned && <Ban className="w-4 h-4 text-destructive flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">@{profile.username} • {profile.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-gold">💰 {profile.points?.toLocaleString()}</span>
                          <span className="text-ruby">💎 {profile.ruby}</span>
                          <span className="text-diamond">💠 {profile.diamonds || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setSendingCurrency({ userId: profile.user_id, userName: profile.display_name })} className="text-gold">
                          <Coins className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEditUser(profile)}>
                          <Edit className="w-4 h-4" />
                        </Button>

                        {/* ====== زر الموقع الجغرافي — للمالك الأصلي فقط ====== */}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleShowLocation(profile)}
                          className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                          title={lang === 'ar' ? 'موقع المستخدم' : 'User Location'}
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>

                        {/* ====== زر معلومات الجهاز — للمالك الأصلي فقط ====== */}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleShowDevice(profile)}
                          className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                          title={lang === 'ar' ? 'معلومات الجهاز' : 'Device Info'}
                        >
                          <Smartphone className="w-4 h-4" />
                        </Button>

                        {!isProtected && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">

                              <DropdownMenuItem onClick={() => handleVerifyUser(profile.user_id, !profile.is_verified)}>
                                <BadgeCheck className="w-4 h-4 mr-2" />
                                {profile.is_verified ? (lang === 'ar' ? 'إلغاء التوثيق' : 'Remove Verification') : (lang === 'ar' ? 'توثيق الحساب' : 'Verify Account')}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSetVIP(profile.user_id, true, 'gold')}>
                                <Crown className="w-4 h-4 mr-2 text-gold" />{lang === 'ar' ? 'ترقية VIP ذهبي' : 'Set VIP Gold'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSetVIP(profile.user_id, true, 'diamond')}>
                                <Crown className="w-4 h-4 mr-2 text-diamond" />{lang === 'ar' ? 'ترقية VIP ماسي' : 'Set VIP Diamond'}
                              </DropdownMenuItem>
                              {profile.is_vip && (
                                <DropdownMenuItem onClick={() => handleSetVIP(profile.user_id, false, null)}>
                                  <Crown className="w-4 h-4 mr-2 text-muted-foreground" />{lang === 'ar' ? 'إلغاء VIP' : 'Remove VIP'}
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {/* ====== تغيير الرتبة — رتبة واحدة فقط ====== */}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <UserCog className="w-4 h-4 mr-2" />
                                  {lang === 'ar' ? 'تغيير الرتبة' : 'Change Role'}
                                  {roleInfo && <span className="mr-auto text-xs opacity-60 mr-2">{roleInfo.icon}</span>}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {/* الرتبة الحالية */}
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                                    الحالية: {roleInfo ? `${roleInfo.icon} ${roleInfo.label}` : '👤 عضو عادي'}
                                  </div>
                                  {/* كل الرتب */}
                                  {ROLES_LIST.map(role => (
                                    <DropdownMenuItem
                                      key={role.key}
                                      onClick={() => handleSetRole(profile.user_id, role.key)}
                                      className={cn(profile.currentRole === role.key && "bg-primary/10 font-bold")}
                                    >
                                      <span className="mr-2 text-base">{role.icon}</span>
                                      {role.label}
                                      {profile.currentRole === role.key && <span className="ml-auto text-primary text-xs">✓</span>}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              {/* ====== سحب الرتبة — زر واحد فقط ====== */}
                              {profile.currentRole && (
                                <DropdownMenuItem
                                  onClick={() => handleRemoveRole(profile.user_id)}
                                  className="text-orange-400 font-bold"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  {lang === 'ar' ? `سحب الرتبة (${roleInfo?.icon} ${roleInfo?.label})` : `Remove Role`}
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleBanUser(profile.user_id, !profile.is_banned)} className="text-destructive">
                                <Ban className="w-4 h-4 mr-2" />
                                {profile.is_banned ? (lang === 'ar' ? 'إلغاء الحظر' : 'Unban') : (lang === 'ar' ? 'حظر' : 'Ban')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? `تعديل: ${editingUser?.display_name}` : `Edit: ${editingUser?.display_name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{lang === 'ar' ? 'الاسم المعروض' : 'Display Name'}</Label><Input value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} /></div>
            <div><Label>{lang === 'ar' ? 'اسم المستخدم' : 'Username'}</Label><Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} /></div>
            <div><Label>{lang === 'ar' ? 'النبذة' : 'Bio'}</Label><Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} /></div>
            <div><Label>{lang === 'ar' ? 'الدولة' : 'Country'}</Label><Input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{lang === 'ar' ? 'المستوى' : 'Level'}</Label><Input type="number" value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>{lang === 'ar' ? 'النقاط' : 'Points'}</Label><Input type="number" value={editForm.points} onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>{lang === 'ar' ? 'الروبي' : 'Ruby'}</Label><Input type="number" value={editForm.ruby} onChange={(e) => setEditForm({ ...editForm, ruby: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>{lang === 'ar' ? 'الماس' : 'Diamonds'}</Label><Input type="number" value={editForm.diamonds} onChange={(e) => setEditForm({ ...editForm, diamonds: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <Button onClick={saveUserEdit} className="w-full gradient-primary">{lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Currency Modal */}
      <Dialog open={!!sendingCurrency} onOpenChange={() => setSendingCurrency(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? `إرسال عملة لـ ${sendingCurrency?.userName}` : `Send currency to ${sendingCurrency?.userName}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant={currencyForm.type === 'points' ? 'default' : 'outline'} onClick={() => setCurrencyForm({ ...currencyForm, type: 'points' })} className="flex-1 gap-2">
                <CircleDollarSign className="w-4 h-4 text-gold" />{lang === 'ar' ? 'نقاط' : 'Points'}
              </Button>
              <Button variant={currencyForm.type === 'ruby' ? 'default' : 'outline'} onClick={() => setCurrencyForm({ ...currencyForm, type: 'ruby' })} className="flex-1 gap-2">
                <Gem className="w-4 h-4 text-ruby" />{lang === 'ar' ? 'روبي' : 'Ruby'}
              </Button>
              <Button variant={currencyForm.type === 'diamonds' ? 'default' : 'outline'} onClick={() => setCurrencyForm({ ...currencyForm, type: 'diamonds' })} className="flex-1 gap-2">
                <Diamond className="w-4 h-4 text-diamond" />{lang === 'ar' ? 'ماس' : 'Diamonds'}
              </Button>
            </div>
            <div>
              <Label>{lang === 'ar' ? 'الكمية' : 'Amount'}</Label>
              <Input type="number" value={currencyForm.amount} onChange={(e) => setCurrencyForm({ ...currencyForm, amount: parseInt(e.target.value) || 0 })} placeholder="1000" />
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 5000, 10000].map((amount) => (
                <Button key={amount} variant="outline" size="sm" onClick={() => setCurrencyForm({ ...currencyForm, amount })}>{amount}</Button>
              ))}
            </div>
            <Button onClick={handleSendCurrency} className="w-full gradient-gold text-black gap-2">
              <Send className="w-4 h-4" />{lang === 'ar' ? 'إرسال' : 'Send'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Modal */}
      <Dialog open={showNotification} onOpenChange={setShowNotification}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? 'إرسال إشعار للجميع' : 'Send Notification to All'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{lang === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label><Input value={notificationForm.title_ar} onChange={(e) => setNotificationForm({ ...notificationForm, title_ar: e.target.value })} placeholder="عنوان الإشعار..." /></div>
            <div><Label>{lang === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label><Input value={notificationForm.title_en} onChange={(e) => setNotificationForm({ ...notificationForm, title_en: e.target.value })} placeholder="Notification title..." /></div>
            <div><Label>{lang === 'ar' ? 'المحتوى (عربي)' : 'Content (Arabic)'}</Label><Textarea value={notificationForm.content_ar} onChange={(e) => setNotificationForm({ ...notificationForm, content_ar: e.target.value })} placeholder="محتوى الإشعار..." /></div>
            <div><Label>{lang === 'ar' ? 'المحتوى (إنجليزي)' : 'Content (English)'}</Label><Textarea value={notificationForm.content_en} onChange={(e) => setNotificationForm({ ...notificationForm, content_en: e.target.value })} placeholder="Notification content..." /></div>
            <Button onClick={handleSendNotification} className="w-full gradient-primary gap-2">
              <Bell className="w-4 h-4" />{lang === 'ar' ? 'إرسال الإشعار' : 'Send Notification'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== نافذة موقع المستخدم الجغرافي ====== */}
      <Dialog open={!!locationModal} onOpenChange={() => setLocationModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" />
              {lang === 'ar' ? `موقع: ${locationModal?.userName}` : `Location: ${locationModal?.userName}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {locationModal?.loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : locationModal?.error ? (
              <div className="text-center py-6 space-y-2">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
                <p className="text-sm text-muted-foreground">{locationModal.error}</p>
                <p className="text-xs text-muted-foreground/60">
                  لتفعيل هذه الميزة، أضف جدول <code className="bg-muted px-1 rounded">user_sessions</code> في Supabase وسجّل بيانات الجلسة عند تسجيل دخول المستخدم.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* معلومات الموقع */}
                <div className="grid grid-cols-2 gap-3">
                  {locationModal?.city && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">المدينة</p>
                      <p className="font-semibold text-sm">{locationModal.city}</p>
                    </div>
                  )}
                  {locationModal?.country && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">الدولة</p>
                      <p className="font-semibold text-sm">{locationModal.country}</p>
                    </div>
                  )}
                  {locationModal?.ip && (
                    <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">عنوان IP</p>
                      <p className="font-semibold text-sm font-mono">{locationModal.ip}</p>
                    </div>
                  )}
                  {locationModal?.lat && locationModal?.lng && (
                    <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">الإحداثيات</p>
                      <p className="font-semibold text-sm font-mono">{locationModal.lat.toFixed(6)}, {locationModal.lng.toFixed(6)}</p>
                    </div>
                  )}
                </div>

                {/* خريطة Google Maps مدمجة */}
                {locationModal?.lat && locationModal?.lng && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <iframe
                      title="user-location"
                      width="100%"
                      height="260"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps?q=${locationModal.lat},${locationModal.lng}&z=14&output=embed`}
                    />
                  </div>
                )}

                {/* زر فتح في خرائط جوجل */}
                {locationModal?.lat && locationModal?.lng && (
                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    onClick={() => window.open(`https://www.google.com/maps?q=${locationModal.lat},${locationModal.lng}`, '_blank')}
                  >
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    {lang === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== نافذة معلومات الجهاز ====== */}
      <Dialog open={!!deviceModal} onOpenChange={() => setDeviceModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              {lang === 'ar' ? `معلومات جهاز: ${deviceModal?.userName}` : `Device Info: ${deviceModal?.userName}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {deviceModal?.loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : deviceModal?.error ? (
              <div className="text-center py-6 space-y-2">
                <Smartphone className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
                <p className="text-sm text-muted-foreground">{deviceModal.error}</p>
                <p className="text-xs text-muted-foreground/60">
                  لتفعيل هذه الميزة، أضف جدول <code className="bg-muted px-1 rounded">user_sessions</code> في Supabase وسجّل بيانات الجلسة عند تسجيل دخول المستخدم.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* نوع الجهاز */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Monitor className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-xs text-muted-foreground">نوع الجهاز</p>
                    </div>
                    <p className="font-semibold text-sm">{deviceModal?.deviceType || '—'}</p>
                  </div>

                  {/* نظام التشغيل */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-xs text-muted-foreground">نظام التشغيل</p>
                    </div>
                    <p className="font-semibold text-sm">{deviceModal?.os || '—'}</p>
                  </div>

                  {/* المتصفح */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Search className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-xs text-muted-foreground">المتصفح</p>
                    </div>
                    <p className="font-semibold text-sm">{deviceModal?.browser || '—'}</p>
                  </div>

                  {/* نوع الشبكة */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wifi className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-xs text-muted-foreground">نوع الشبكة</p>
                    </div>
                    <p className="font-semibold text-sm">{deviceModal?.network || '—'}</p>
                  </div>

                  {/* عنوان IP */}
                  {deviceModal?.ip && (
                    <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                        <p className="text-xs text-muted-foreground">عنوان IP</p>
                      </div>
                      <p className="font-semibold text-sm font-mono">{deviceModal.ip}</p>
                    </div>
                  )}

                  {/* حجم الشاشة */}
                  {deviceModal?.screenSize && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Monitor className="w-3.5 h-3.5 text-blue-500" />
                        <p className="text-xs text-muted-foreground">حجم الشاشة</p>
                      </div>
                      <p className="font-semibold text-sm">{deviceModal.screenSize}</p>
                    </div>
                  )}

                  {/* الوقت المحلي */}
                  {deviceModal?.localTime && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <p className="text-xs text-muted-foreground">التوقيت المحلي</p>
                      </div>
                      <p className="font-semibold text-sm">{deviceModal.localTime}</p>
                    </div>
                  )}
                </div>

                {/* User Agent الكامل */}
                {deviceModal?.userAgent && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">User Agent</p>
                    <p className="text-xs font-mono break-all text-muted-foreground leading-relaxed">{deviceModal.userAgent}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Admin;
