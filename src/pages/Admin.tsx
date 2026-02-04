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
  Send, Gem, CircleDollarSign, Diamond, Plus, UserCog
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
  
  // Edit User Modal
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
  
  // Send Currency Modal
  const [sendingCurrency, setSendingCurrency] = useState<{userId: string; userName: string} | null>(null);
  const [currencyForm, setCurrencyForm] = useState({
    type: 'points' as 'points' | 'ruby' | 'diamonds',
    amount: 0,
  });
  
  // Notification Modal
  const [showNotification, setShowNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title_ar: '',
    title_en: '',
    content_ar: '',
    content_en: '',
    target_audience: 'everyone',
  });

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
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: onlineUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');

      const { count: activeLives } = await supabase
        .from('personal_lives')
        .select('*', { count: 'exact', head: true })
        .eq('is_live', true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todayStories } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      const { count: totalGifts } = await supabase
        .from('sent_gifts')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        activeLives: activeLives || 0,
        todayStories: todayStories || 0,
        totalMessages: totalMessages || 0,
        totalGifts: totalGifts || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingData(false);
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
      const { error } = await supabase
        .from('profiles')
        .update({
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
        })
        .eq('user_id', editingUser.user_id);

      if (error) throw error;
      
      toast.success(lang === 'ar' ? 'تم حفظ التغييرات' : 'Changes saved');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(lang === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes');
    }
  };

  const handleSendCurrency = async () => {
    if (!sendingCurrency || currencyForm.amount <= 0) return;
    
    try {
      const profile = users.find(u => u.user_id === sendingCurrency.userId);
      if (!profile) return;

      const updateData: any = {};
      if (currencyForm.type === 'points') {
        updateData.points = profile.points + currencyForm.amount;
      } else if (currencyForm.type === 'ruby') {
        updateData.ruby = profile.ruby + currencyForm.amount;
      } else if (currencyForm.type === 'diamonds') {
        updateData.diamonds = (profile.diamonds || 0) + currencyForm.amount;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', sendingCurrency.userId);

      if (error) throw error;

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: sendingCurrency.userId,
        transaction_type: 'admin_gift',
        currency: currencyForm.type,
        amount: currencyForm.amount,
        balance_after: updateData[currencyForm.type],
        description: `Gift from admin: ${currencyForm.amount} ${currencyForm.type}`,
      });

      toast.success(
        lang === 'ar' 
          ? `تم إرسال ${currencyForm.amount} ${currencyForm.type === 'points' ? 'نقطة' : currencyForm.type === 'ruby' ? 'روبي' : 'ماسة'}`
          : `Sent ${currencyForm.amount} ${currencyForm.type}`
      );
      setSendingCurrency(null);
      setCurrencyForm({ type: 'points', amount: 0 });
      fetchUsers();
    } catch (error) {
      console.error('Error sending currency:', error);
      toast.error(lang === 'ar' ? 'فشل الإرسال' : 'Failed to send');
    }
  };

  const handleSendNotification = async () => {
    try {
      // Insert into new notifications table
      const { error } = await supabase.from('notifications').insert({
        title_ar: notificationForm.title_ar,
        title_en: notificationForm.title_en,
        content_ar: notificationForm.content_ar,
        content_en: notificationForm.content_en,
        type: 'global',
        user_id: null, // null = global notification
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success(lang === 'ar' ? 'تم إرسال الإشعار للجميع' : 'Notification sent to everyone');
      setShowNotification(false);
      setNotificationForm({
        title_ar: '',
        title_en: '',
        content_ar: '',
        content_en: '',
        target_audience: 'everyone',
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(lang === 'ar' ? 'فشل إرسال الإشعار' : 'Failed to send notification');
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_banned: ban,
          ban_reason: ban ? 'Banned by admin' : null,
        })
        .eq('user_id', userId);

      if (error) throw error;
      fetchUsers();
      toast.success(ban 
        ? (lang === 'ar' ? 'تم حظر المستخدم' : 'User banned')
        : (lang === 'ar' ? 'تم إلغاء الحظر' : 'User unbanned')
      );
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleVerifyUser = async (userId: string, verify: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: verify })
        .eq('user_id', userId);

      if (error) throw error;
      fetchUsers();
      toast.success(verify 
        ? (lang === 'ar' ? 'تم توثيق الحساب' : 'Account verified')
        : (lang === 'ar' ? 'تم إلغاء التوثيق' : 'Verification removed')
      );
    } catch (error) {
      console.error('Error verifying user:', error);
    }
  };

  const handleSetVIP = async (userId: string, vip: boolean, vipType: 'gold' | 'diamond' | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_vip: vip,
          vip_type: vipType,
          vip_expires_at: vip ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        })
        .eq('user_id', userId);

      if (error) throw error;
      fetchUsers();
      toast.success(vip 
        ? (lang === 'ar' ? `تم ترقية إلى VIP ${vipType}` : `Upgraded to VIP ${vipType}`)
        : (lang === 'ar' ? 'تم إلغاء VIP' : 'VIP removed')
      );
    } catch (error) {
      console.error('Error setting VIP:', error);
    }
  };

  const handleSetRole = async (userId: string, role: UserRole) => {
    try {
      // First check if user already has this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();

      if (existingRole) {
        toast.info(lang === 'ar' ? 'المستخدم لديه هذه الرتبة بالفعل' : 'User already has this role');
        return;
      }

      // Add the new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          assigned_by: user?.id,
        });

      if (error) throw error;

      toast.success(
        lang === 'ar' 
          ? `تم منح رتبة ${ROLE_HIERARCHY[role]?.name_ar || role}`
          : `Granted ${ROLE_HIERARCHY[role]?.name_en || role} role`
      );
    } catch (error) {
      console.error('Error setting role:', error);
      toast.error(lang === 'ar' ? 'فشل تعيين الرتبة' : 'Failed to set role');
    }
  };

  const handleRemoveRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast.success(
        lang === 'ar' 
          ? `تم سحب رتبة ${ROLE_HIERARCHY[role]?.name_ar || role}`
          : `Removed ${ROLE_HIERARCHY[role]?.name_en || role} role`
      );
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error(lang === 'ar' ? 'فشل سحب الرتبة' : 'Failed to remove role');
    }
  };

  const filteredUsers = users.filter(u =>
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      {/* Header */}
      <header className="sticky top-0 z-50 glass-dark border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold" />
              <h1 className="font-bold">
                {lang === 'ar' ? 'لوحة المالك' : 'Owner Panel'}
              </h1>
            </div>
          </div>
          
          <Button 
            onClick={() => setShowNotification(true)}
            className="gradient-primary gap-2"
            size="sm"
          >
            <Bell className="w-4 h-4" />
            {lang === 'ar' ? 'إشعار' : 'Notify'}
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="gradient-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-status-online/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-status-online" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.onlineUsers}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'متصل الآن' : 'Online Now'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-status-live/20 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-status-live" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeLives}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'لايف نشط' : 'Active Lives'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalMessages}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'الرسائل' : 'Messages'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalGifts}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'الهدايا' : 'Gifts'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Award className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayStories}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'استوريات اليوم' : 'Today Stories'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={lang === 'ar' ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Users List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                filteredUsers.map((profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors",
                      profile.is_banned && "opacity-50"
                    )}
                  >
                    <div 
                      className="w-12 h-12 rounded-full overflow-hidden bg-muted cursor-pointer"
                      onClick={() => navigate(`/profile/${profile.user_id}`)}
                    >
                      {profile.profile_picture ? (
                        <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-bold">
                          {profile.display_name[0]}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{profile.display_name}</span>
                        {profile.is_verified && <BadgeCheck className="w-4 h-4 text-diamond" />}
                        {profile.is_vip && (
                          <Crown className={cn("w-4 h-4", profile.vip_type === 'diamond' ? 'text-diamond' : 'text-gold')} />
                        )}
                        {profile.is_banned && <Ban className="w-4 h-4 text-destructive" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{profile.username} • {profile.email}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-gold">💰 {profile.points.toLocaleString()}</span>
                        <span className="text-ruby">💎 {profile.ruby}</span>
                        <span className="text-diamond">💠 {profile.diamonds || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Send Currency */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSendingCurrency({ userId: profile.user_id, userName: profile.display_name })}
                        className="text-gold"
                      >
                        <Coins className="w-4 h-4" />
                      </Button>

                      {/* Edit User */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditUser(profile)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleVerifyUser(profile.user_id, !profile.is_verified)}>
                            <BadgeCheck className="w-4 h-4 mr-2" />
                            {profile.is_verified
                              ? (lang === 'ar' ? 'إلغاء التوثيق' : 'Remove Verification')
                              : (lang === 'ar' ? 'توثيق الحساب' : 'Verify Account')
                            }
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleSetVIP(profile.user_id, true, 'gold')}>
                            <Crown className="w-4 h-4 mr-2 text-gold" />
                            {lang === 'ar' ? 'ترقية VIP ذهبي' : 'Set VIP Gold'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSetVIP(profile.user_id, true, 'diamond')}>
                            <Crown className="w-4 h-4 mr-2 text-diamond" />
                            {lang === 'ar' ? 'ترقية VIP ماسي' : 'Set VIP Diamond'}
                          </DropdownMenuItem>
                          {profile.is_vip && (
                            <DropdownMenuItem onClick={() => handleSetVIP(profile.user_id, false, null)}>
                              <Crown className="w-4 h-4 mr-2 text-muted-foreground" />
                              {lang === 'ar' ? 'إلغاء VIP' : 'Remove VIP'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          
                          {/* Role Management Submenu */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <UserCog className="w-4 h-4 mr-2" />
                              {lang === 'ar' ? 'إدارة الرتب' : 'Manage Roles'}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleSetRole(profile.user_id, 'vip')}>
                                <span className="mr-2">⭐</span>
                                {lang === 'ar' ? 'عضو مميز (VIP)' : 'VIP Member'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSetRole(profile.user_id, 'moderator')}>
                                <span className="mr-2">🛡️</span>
                                {lang === 'ar' ? 'مشرف' : 'Moderator'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSetRole(profile.user_id, 'admin')}>
                                <span className="mr-2">⚙️</span>
                                {lang === 'ar' ? 'إدارة' : 'Admin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSetRole(profile.user_id, 'super_admin')}>
                                <span className="mr-2">👑</span>
                                {lang === 'ar' ? 'إدارة عليا' : 'Super Admin'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRemoveRole(profile.user_id, 'vip')}
                                className="text-destructive"
                              >
                                {lang === 'ar' ? 'سحب VIP' : 'Remove VIP'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleRemoveRole(profile.user_id, 'moderator')}
                                className="text-destructive"
                              >
                                {lang === 'ar' ? 'سحب المشرف' : 'Remove Moderator'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleRemoveRole(profile.user_id, 'admin')}
                                className="text-destructive"
                              >
                                {lang === 'ar' ? 'سحب الإدارة' : 'Remove Admin'}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleBanUser(profile.user_id, !profile.is_banned)}
                            className="text-destructive"
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            {profile.is_banned
                              ? (lang === 'ar' ? 'إلغاء الحظر' : 'Unban')
                              : (lang === 'ar' ? 'حظر' : 'Ban')
                            }
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {lang === 'ar' ? `تعديل: ${editingUser?.display_name}` : `Edit: ${editingUser?.display_name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{lang === 'ar' ? 'الاسم المعروض' : 'Display Name'}</Label>
              <Input
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              />
            </div>
            <div>
              <Label>{lang === 'ar' ? 'اسم المستخدم' : 'Username'}</Label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              />
            </div>
            <div>
              <Label>{lang === 'ar' ? 'النبذة' : 'Bio'}</Label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </div>
            <div>
              <Label>{lang === 'ar' ? 'الدولة' : 'Country'}</Label>
              <Input
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{lang === 'ar' ? 'المستوى' : 'Level'}</Label>
                <Input
                  type="number"
                  value={editForm.level}
                  onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{lang === 'ar' ? 'النقاط' : 'Points'}</Label>
                <Input
                  type="number"
                  value={editForm.points}
                  onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{lang === 'ar' ? 'الروبي' : 'Ruby'}</Label>
                <Input
                  type="number"
                  value={editForm.ruby}
                  onChange={(e) => setEditForm({ ...editForm, ruby: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{lang === 'ar' ? 'الماس' : 'Diamonds'}</Label>
                <Input
                  type="number"
                  value={editForm.diamonds}
                  onChange={(e) => setEditForm({ ...editForm, diamonds: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <Button onClick={saveUserEdit} className="w-full gradient-primary">
              {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Currency Modal */}
      <Dialog open={!!sendingCurrency} onOpenChange={() => setSendingCurrency(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lang === 'ar' ? `إرسال عملة لـ ${sendingCurrency?.userName}` : `Send currency to ${sendingCurrency?.userName}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={currencyForm.type === 'points' ? 'default' : 'outline'}
                onClick={() => setCurrencyForm({ ...currencyForm, type: 'points' })}
                className="flex-1 gap-2"
              >
                <CircleDollarSign className="w-4 h-4 text-gold" />
                {lang === 'ar' ? 'نقاط' : 'Points'}
              </Button>
              <Button
                variant={currencyForm.type === 'ruby' ? 'default' : 'outline'}
                onClick={() => setCurrencyForm({ ...currencyForm, type: 'ruby' })}
                className="flex-1 gap-2"
              >
                <Gem className="w-4 h-4 text-ruby" />
                {lang === 'ar' ? 'روبي' : 'Ruby'}
              </Button>
              <Button
                variant={currencyForm.type === 'diamonds' ? 'default' : 'outline'}
                onClick={() => setCurrencyForm({ ...currencyForm, type: 'diamonds' })}
                className="flex-1 gap-2"
              >
                <Diamond className="w-4 h-4 text-diamond" />
                {lang === 'ar' ? 'ماس' : 'Diamonds'}
              </Button>
            </div>
            <div>
              <Label>{lang === 'ar' ? 'الكمية' : 'Amount'}</Label>
              <Input
                type="number"
                value={currencyForm.amount}
                onChange={(e) => setCurrencyForm({ ...currencyForm, amount: parseInt(e.target.value) || 0 })}
                placeholder="1000"
              />
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 5000, 10000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrencyForm({ ...currencyForm, amount })}
                >
                  {amount}
                </Button>
              ))}
            </div>
            <Button onClick={handleSendCurrency} className="w-full gradient-gold text-black gap-2">
              <Send className="w-4 h-4" />
              {lang === 'ar' ? 'إرسال' : 'Send'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Modal */}
      <Dialog open={showNotification} onOpenChange={setShowNotification}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lang === 'ar' ? 'إرسال إشعار للجميع' : 'Send Notification to All'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{lang === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label>
              <Input
                value={notificationForm.title_ar}
                onChange={(e) => setNotificationForm({ ...notificationForm, title_ar: e.target.value })}
                placeholder="عنوان الإشعار..."
              />
            </div>
            <div>
              <Label>{lang === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
              <Input
                value={notificationForm.title_en}
                onChange={(e) => setNotificationForm({ ...notificationForm, title_en: e.target.value })}
                placeholder="Notification title..."
              />
            </div>
            <div>
              <Label>{lang === 'ar' ? 'المحتوى (عربي)' : 'Content (Arabic)'}</Label>
              <Textarea
                value={notificationForm.content_ar}
                onChange={(e) => setNotificationForm({ ...notificationForm, content_ar: e.target.value })}
                placeholder="محتوى الإشعار..."
              />
            </div>
            <div>
              <Label>{lang === 'ar' ? 'المحتوى (إنجليزي)' : 'Content (English)'}</Label>
              <Textarea
                value={notificationForm.content_en}
                onChange={(e) => setNotificationForm({ ...notificationForm, content_en: e.target.value })}
                placeholder="Notification content..."
              />
            </div>
            <Button onClick={handleSendNotification} className="w-full gradient-primary gap-2">
              <Bell className="w-4 h-4" />
              {lang === 'ar' ? 'إرسال الإشعار' : 'Send Notification'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
