import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, MessageCircle, Users, UserCheck, Shield } from 'lucide-react';
import { toast } from 'sonner';

const PrivacySettings: React.FC = () => {
  const { lang } = useLanguage();
  const { profile, refreshProfile } = useAuth();

  const [privateChatSetting, setPrivateChatSetting] = useState(profile?.private_chat_setting || 'everyone');
  const [privateChatPassword, setPrivateChatPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(!!profile?.private_chat_password);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          private_chat_setting: privateChatSetting,
          private_chat_password: hasPassword && privateChatPassword ? privateChatPassword : null,
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast.success(lang === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
      refreshProfile?.();
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error(lang === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const privacyOptions = [
    { value: 'everyone', label: lang === 'ar' ? 'الجميع' : 'Everyone', icon: Users },
    { value: 'friends_only', label: lang === 'ar' ? 'الأصدقاء فقط' : 'Friends Only', icon: UserCheck },
    { value: 'followers_only', label: lang === 'ar' ? 'المتابعين فقط' : 'Followers Only', icon: UserCheck },
    { value: 'none', label: lang === 'ar' ? 'لا أحد' : 'No One', icon: Shield },
  ];

  return (
    <div className="space-y-6 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2 pb-4 border-b">
        <Lock className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">
          {lang === 'ar' ? 'إعدادات الخصوصية' : 'Privacy Settings'}
        </h3>
      </div>

      {/* Who can message you */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {lang === 'ar' ? 'من يستطيع مراسلتك' : 'Who can message you'}
        </Label>
        <Select value={privateChatSetting} onValueChange={setPrivateChatSetting}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {privacyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {privateChatSetting === 'everyone' && (lang === 'ar' ? 'أي شخص يمكنه مراسلتك' : 'Anyone can message you')}
          {privateChatSetting === 'friends_only' && (lang === 'ar' ? 'فقط أصدقائك يمكنهم مراسلتك' : 'Only your friends can message you')}
          {privateChatSetting === 'followers_only' && (lang === 'ar' ? 'فقط متابعيك يمكنهم مراسلتك' : 'Only your followers can message you')}
          {privateChatSetting === 'none' && (lang === 'ar' ? 'لا أحد يستطيع مراسلتك' : 'No one can message you')}
        </p>
      </div>

      {/* Password lock */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {lang === 'ar' ? 'قفل الخاص بكلمة سر' : 'Lock Private Messages'}
          </Label>
          <Switch checked={hasPassword} onCheckedChange={setHasPassword} />
        </div>
        
        {hasPassword && (
          <Input
            type="password"
            value={privateChatPassword}
            onChange={(e) => setPrivateChatPassword(e.target.value)}
            placeholder={lang === 'ar' ? 'أدخل كلمة السر...' : 'Enter password...'}
          />
        )}
        <p className="text-xs text-muted-foreground">
          {lang === 'ar' 
            ? 'عند تفعيل هذا الخيار، لن تُعرض رسائلك إلا بعد إدخال كلمة السر'
            : 'When enabled, your messages will only be shown after entering the password'}
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الإعدادات' : 'Save Settings')}
      </Button>
    </div>
  );
};

export default PrivacySettings;
