import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  User, Globe, Bell, Lock, Shield, HelpCircle, 
  LogOut, ChevronLeft, Moon, Smartphone 
} from 'lucide-react';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { t, lang, setLang } = useLanguage();
  const { signOut, profile, isOwner } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
    toast.success(lang === 'ar' ? 'تم تسجيل الخروج' : 'Logged out successfully');
  };

  const settingsGroups = [
    {
      title: lang === 'ar' ? 'الحساب' : 'Account',
      items: [
        {
          icon: User,
          label: lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile',
          onClick: () => navigate('/profile'),
        },
        {
          icon: Lock,
          label: lang === 'ar' ? 'الخصوصية والأمان' : 'Privacy & Security',
          onClick: () => {},
        },
      ],
    },
    {
      title: lang === 'ar' ? 'التفضيلات' : 'Preferences',
      items: [
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
      ],
    },
    {
      title: lang === 'ar' ? 'المزيد' : 'More',
      items: [
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
      ],
    },
  ];

  return (
    <MainLayout>
      <div className="px-4 py-4 space-y-6">
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
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary">
                {profile?.profile_picture ? (
                  <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl font-bold">
                    {profile?.display_name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{profile?.display_name}</p>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              </div>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="gap-2"
                >
                  <Shield className="w-4 h-4" />
                  {t('admin')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings Groups */}
        {settingsGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground px-1">
              {group.title}
            </h2>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {group.items.map((item, itemIdx) => (
                  <button
                    key={itemIdx}
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
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
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}

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
