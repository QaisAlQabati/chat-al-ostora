import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Radio, MessageCircle, Gift, Shield, 
  TrendingUp, Search, ChevronLeft, Crown, BadgeCheck,
  MoreVertical, Ban, Coins, Award, Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  is_verified: boolean;
  is_vip: boolean;
  is_banned: boolean;
  status: string;
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

  const handleAddPoints = async (userId: string, amount: number) => {
    try {
      const user = users.find(u => u.user_id === userId);
      if (!user) return;
      
      const { error } = await supabase
        .from('profiles')
        .update({ points: user.points + amount })
        .eq('user_id', userId);

      if (error) throw error;
      fetchUsers();
      toast.success(lang === 'ar' ? `تمت إضافة ${amount} نقطة` : `Added ${amount} points`);
    } catch (error) {
      console.error('Error adding points:', error);
      toast.error(lang === 'ar' ? 'فشل إضافة النقاط' : 'Failed to add points');
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
    <div className="min-h-screen bg-background">
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
                {lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}
              </h1>
            </div>
          </div>
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
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                filteredUsers.map((profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg bg-muted/50",
                      profile.is_banned && "opacity-50"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
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
                        {profile.is_vip && <Crown className="w-4 h-4 text-gold" />}
                        {profile.is_banned && <Ban className="w-4 h-4 text-destructive" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{profile.username} • {profile.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gold font-bold">
                        💰 {profile.points.toLocaleString()}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAddPoints(profile.user_id, 100)}>
                            <Coins className="w-4 h-4 mr-2" />
                            {lang === 'ar' ? 'إضافة 100 نقطة' : 'Add 100 Points'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddPoints(profile.user_id, 1000)}>
                            <Coins className="w-4 h-4 mr-2" />
                            {lang === 'ar' ? 'إضافة 1000 نقطة' : 'Add 1000 Points'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleVerifyUser(profile.user_id, !profile.is_verified)}>
                            <BadgeCheck className="w-4 h-4 mr-2" />
                            {profile.is_verified
                              ? (lang === 'ar' ? 'إلغاء التوثيق' : 'Remove Verification')
                              : (lang === 'ar' ? 'توثيق الحساب' : 'Verify Account')
                            }
                          </DropdownMenuItem>
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
    </div>
  );
};

export default Admin;
