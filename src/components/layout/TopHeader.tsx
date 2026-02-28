import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bell, Shield, Globe, Menu, Search, Trophy, Activity, Users, Crown, Star, Sparkles, Newspaper, Megaphone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NotificationsModal from '@/components/notifications/NotificationsModal';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import RichThroneModal from '@/components/systems/RichThroneModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const TopHeader: React.FC = () => {
  const { t, lang } = useLanguage();
  const { profile, isOwner } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRichThrone, setShowRichThrone] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const handleSearch = () => {
    if (userSearchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(userSearchQuery)}`);
    }
  };

  const canSeeAdmin = isOwner || profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side={lang === 'ar' ? 'right' : 'left'} className="w-[300px]">
              <SheetHeader className="text-right border-b pb-4 mb-4">
                <SheetTitle className="text-xl font-bold">
                  {lang === 'ar' ? 'القائمة' : 'Menu'}
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3">

                <Button 
                  variant="ghost" 
                  className="justify-start h-14 text-lg gap-4 px-4 hover:bg-yellow-500/10 hover:text-yellow-600 rounded-xl"
                  onClick={() => setShowRichThrone(true)}
                >
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  {lang === 'ar' ? 'عرش الأثرياء' : 'Rich Throne'}
                </Button>

                <Button 
                  variant="ghost" 
                  className="justify-start h-14 text-lg gap-4 px-4 hover:bg-orange-500/10 hover:text-orange-600 rounded-xl"
                  onClick={() => navigate('/posts')}
                >
                  <Activity className="w-6 h-6 text-orange-500" />
                  {lang === 'ar' ? 'التفاعل' : 'Activity'}
                </Button>

                <Button 
                  variant="ghost" 
                  className="justify-start h-14 text-lg gap-4 px-4 hover:bg-blue-500/10 hover:text-blue-600 rounded-xl"
                  onClick={() => navigate('/rooms')}
                >
                  <Users className="w-6 h-6 text-blue-500" />
                  {lang === 'ar' ? 'الغرف' : 'Rooms'}
                </Button>

                {/* ✅ زر الأخبار */}
                <Button 
                  variant="ghost" 
                  className="relative justify-start h-16 text-lg gap-4 px-4 rounded-xl overflow-hidden group"
                  style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(59,130,246,0.08) 100%)' }}
                  onClick={() => navigate('/news')}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.18) 0%, rgba(59,130,246,0.18) 100%)' }}
                  />
                  <Newspaper className="w-6 h-6 text-cyan-400 relative z-10" />
                  <div className="flex flex-col items-start relative z-10">
                    <span className="font-bold text-base"
                      style={{
                        background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {lang === 'ar' ? '📰 الأخبار' : '📰 News'}
                    </span>
                    <span className="text-[10px] text-cyan-500/70 font-semibold">
                      {lang === 'ar' ? 'آخر المستجدات' : 'Latest Updates'}
                    </span>
                  </div>
                </Button>

                {/* ✅ زر الإعلانات */}
                <Button 
                  variant="ghost" 
                  className="relative justify-start h-16 text-lg gap-4 px-4 rounded-xl overflow-hidden group"
                  style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(249,115,22,0.08) 100%)' }}
                  onClick={() => navigate('/announcements')}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(249,115,22,0.18) 100%)' }}
                  />
                  <Megaphone className="w-6 h-6 text-red-400 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                  <div className="flex flex-col items-start relative z-10">
                    <span className="font-bold text-base"
                      style={{
                        background: 'linear-gradient(90deg, #ef4444, #f97316)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {lang === 'ar' ? '📣 الإعلانات' : '📣 Announcements'}
                    </span>
                    <span className="text-[10px] text-red-400/70 font-semibold">
                      {lang === 'ar' ? 'أحدث الإعلانات' : 'Latest Announcements'}
                    </span>
                  </div>
                </Button>

                <div className="h-px bg-border my-2" />

                <Button 
                  variant="ghost" 
                  className="justify-start h-14 text-lg gap-4 px-4 hover:bg-green-500/10 hover:text-green-600 rounded-xl"
                  onClick={() => navigate('/activate-members')}
                >
                  <Star className="w-6 h-6 text-green-500" />
                  {lang === 'ar' ? 'تفاعل الأعضاء' : 'Members Activity'}
                </Button>

                <Button 
                  variant="ghost" 
                  className="justify-start h-14 text-lg gap-4 px-4 hover:bg-purple-500/10 hover:text-purple-600 rounded-xl"
                  onClick={() => navigate('/activate-admins')}
                >
                  <Sparkles className="w-6 h-6 text-purple-500" />
                  {lang === 'ar' ? 'تفاعل الإدارة' : 'Admins Activity'}
                </Button>

                <Button 
                  variant="ghost" 
                  className="relative justify-start h-16 text-lg gap-4 px-4 rounded-xl overflow-hidden group"
                  style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,165,0,0.08) 50%, rgba(255,69,0,0.08) 100%)' }}
                  onClick={() => navigate('/chat-kings')}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.15) 50%, rgba(255,69,0,0.15) 100%)' }}
                  />
                  <span className="text-2xl relative z-10">👑</span>
                  <div className="flex flex-col items-start relative z-10">
                    <span className="font-black text-base"
                      style={{
                        background: 'linear-gradient(90deg, #FFD700, #FFA500, #FF4500)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {lang === 'ar' ? '✨ مُلُوكُ الشَّات ✨' : '✨ Chat Kings ✨'}
                    </span>
                    <span className="text-[10px] text-yellow-500/70 font-semibold tracking-wider">
                      {lang === 'ar' ? '— أسـاطـيـر الـمـنـصـة —' : '— Legends of the Platform —'}
                    </span>
                  </div>
                  <Crown className="w-5 h-5 ml-auto relative z-10 text-yellow-500 group-hover:rotate-12 transition-transform duration-300" />
                </Button>

                <div className="h-px bg-border my-2" />

                {canSeeAdmin && (
                  <Button 
                    variant="ghost" 
                    className="justify-start h-14 text-lg gap-4 px-4 hover:bg-primary/10 hover:text-primary rounded-xl"
                    onClick={() => navigate('/admin')}
                  >
                    <Shield className="w-6 h-6 text-primary" />
                    {lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}
                  </Button>
                )}

                <Button 
                  variant="ghost" 
                  className="justify-start h-14 text-lg gap-4 px-4 hover:bg-muted/10 rounded-xl"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-6 h-6 text-muted-foreground" />
                  {lang === 'ar' ? 'الإعدادات' : 'Settings'}
                </Button>

              </div>
            </SheetContent>
          </Sheet>

          <div className="relative flex-1 group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder={lang === 'ar' ? "البحث عن أشخاص..." : "Search people..."}
              className="pr-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-9 rounded-full text-right text-xs"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* ===== الأزرار اليمين: إشعار + إعدادات + إدارة ===== */}
          <div className="flex items-center gap-1 shrink-0">

            {/* زر الإشعارات */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(true)}
              className="text-muted-foreground relative h-9 w-9"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-destructive rounded-full text-[9px] flex items-center justify-center text-destructive-foreground font-bold px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {/* زر الإعدادات */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="text-muted-foreground h-9 w-9"
              title={lang === 'ar' ? 'الإعدادات' : 'Settings'}
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* زر الإدارة — للمالك والأدمن فقط */}
            {canSeeAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
                className="text-primary h-9 w-9"
                title={lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}
              >
                <Shield className="w-5 h-5" />
              </Button>
            )}

          </div>
        </div>
      </header>

      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      <Dialog open={showRichThrone} onOpenChange={setShowRichThrone}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background rounded-3xl border-none">
          <RichThroneModal />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TopHeader;
