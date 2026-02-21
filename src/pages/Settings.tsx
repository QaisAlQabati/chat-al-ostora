import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import AccountSettings from '@/components/settings/AccountSettings';
import ChatSettings from '@/components/settings/ChatSettings';
import PrivacySettings from '@/components/settings/PrivacySettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import RoleBadge from '@/components/common/RoleBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Globe, Bell, Shield, HelpCircle, 
  LogOut, ChevronLeft, Moon, Trophy
} from 'lucide-react';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { t, lang, setLang } = useLanguage();
  const { signOut, profile, isOwner } = useAuth();
  const { maxRole, roleInfo, permissions } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
    toast.success(lang === 'ar' ? 'تم تسجيل الخروج' : 'Logged out successfully');
  };

  const preferencesItems = [
    {
      icon: Globe,
      label: lang === 'ar' ? 'اللغة' : 'Language',
      value: lang === 'ar' ? 'العربية' : 'English',
      onClick: () => setLang(lang === 'ar' ? 'en' : 'ar'),
    },
    {
      icon: Bell,
      label: lang === 'ar' ? 'الإشعارات' : 'Notifications',
      hasSwitch: true,
    },
    {
      icon: Moon,
      label: lang === 'ar' ? 'الوضع الليلي' : 'Dark Mode',
      hasSwitch: true,
      defaultChecked: true,
    },
  ];

  const moreItems = [
    {
      icon: HelpCircle,
      label: lang === 'ar' ? 'المساعدة والدعم' : 'Help & Support',
      onClick: () => {},
    },
    {
      icon: Shield,
      label: lang === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions',
      onClick: () => {},
    },
  ];

  return (
    <MainLayout>
      <div className="px-4 py-4 space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">{t('settings')}</h1>
        </div>

        {/* Profile Card */}
        <Card className="gradient-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary relative">
                {profile?.profile_picture ? (
                  <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl font-bold">
                    {profile?.display_name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{profile?.display_name}</p>
                  {permissions.isOwner && (
                    <span className="text-lg" title={lang === 'ar' ? 'مالك الموقع' : 'Site Owner'}>
                      🏆
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                <div className="mt-1">
                  <RoleBadge role={maxRole} size="sm" />
                </div>
              </div>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  {t('admin')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <AccountSettings />

        {/* Chat Settings */}
        <ChatSettings />

        {/* Privacy Settings */}
        <PrivacySettings />

        {/* Preferences */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground px-1">
            {lang === 'ar' ? 'التفضيلات' : 'Preferences'}
          </h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {preferencesItems.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  onClick={!item.hasSwitch ? item.onClick : undefined}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  role={!item.hasSwitch ? "button" : undefined}
                  tabIndex={!item.hasSwitch ? 0 : undefined}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span>{item.label}</span>
                  </div>
                  {item.hasSwitch ? (
                    <Switch defaultChecked={item.defaultChecked} />
                  ) : item.value ? (
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  ) : (
                    <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* More */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground px-1">
            {lang === 'ar' ? 'المزيد' : 'More'}
          </h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {moreItems.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Role Permissions Info */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {lang === 'ar' ? 'صلاحياتك' : 'Your Permissions'}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={permissions.canSendMedia ? 'text-green-500' : 'text-red-500'}>
                  {permissions.canSendMedia ? '✓' : '✗'}
                </span>
                <span>{lang === 'ar' ? 'إرسال الوسائط' : 'Send Media'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={permissions.canMuteUsers ? 'text-green-500' : 'text-red-500'}>
                  {permissions.canMuteUsers ? '✓' : '✗'}
                </span>
                <span>{lang === 'ar' ? 'كتم المستخدمين' : 'Mute Users'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={permissions.canDeleteMessages ? 'text-green-500' : 'text-red-500'}>
                  {permissions.canDeleteMessages ? '✓' : '✗'}
                </span>
                <span>{lang === 'ar' ? 'حذف الرسائل' : 'Delete Messages'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={permissions.canManageRoom ? 'text-green-500' : 'text-red-500'}>
                  {permissions.canManageRoom ? '✓' : '✗'}
                </span>
                <span>{lang === 'ar' ? 'إدارة الغرف' : 'Manage Rooms'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={permissions.canBanFromSite ? 'text-green-500' : 'text-red-500'}>
                  {permissions.canBanFromSite ? '✓' : '✗'}
                </span>
                <span>{lang === 'ar' ? 'الحظر من الموقع' : 'Site Ban'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={permissions.canManageRoles ? 'text-green-500' : 'text-red-500'}>
                  {permissions.canManageRoles ? '✓' : '✗'}
                </span>
                <span>{lang === 'ar' ? 'إدارة الرتب' : 'Manage Roles'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {t('logout')}
        </Button>

        {/* App Info */}
        <p className="text-center text-xs text-muted-foreground">
          {t('appName')} v1.0.0
        </p>
      </div>
    </MainLayout>
  );
};

export default Settings;
