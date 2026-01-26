import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Palette, Type, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface UserSettings {
  name_color: string;
  font_color: string;
  name_glow: boolean;
}

const ChatSettings: React.FC = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<UserSettings>({
    name_color: '#ffffff',
    font_color: '#ffffff',
    name_glow: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          name_color: data.name_color || '#ffffff',
          font_color: data.font_color || '#ffffff',
          name_glow: data.name_glow || false,
        });
      } else {
        // Create default settings
        await supabase
          .from('user_settings')
          .insert({ user_id: user?.id });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          name_color: settings.name_color,
          font_color: settings.font_color,
          name_glow: settings.name_glow,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(lang === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(lang === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {lang === 'ar' ? 'إعدادات الدردشة' : 'Chat Settings'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name Color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            {lang === 'ar' ? 'لون الاسم' : 'Name Color'}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="color"
              value={settings.name_color}
              onChange={(e) => setSettings({ ...settings, name_color: e.target.value })}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <div 
              className="flex-1 p-3 bg-muted rounded-lg"
              style={{ color: settings.name_color }}
            >
              <span className={settings.name_glow ? 'animate-pulse' : ''}>
                {lang === 'ar' ? 'معاينة الاسم' : 'Name Preview'}
              </span>
            </div>
          </div>
        </div>

        {/* Font Color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            {lang === 'ar' ? 'لون الخط' : 'Font Color'}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="color"
              value={settings.font_color}
              onChange={(e) => setSettings({ ...settings, font_color: e.target.value })}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <div 
              className="flex-1 p-3 bg-muted rounded-lg"
              style={{ color: settings.font_color }}
            >
              {lang === 'ar' ? 'معاينة الرسالة' : 'Message Preview'}
            </div>
          </div>
        </div>

        {/* Name Glow */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-medium">
                {lang === 'ar' ? 'تأثير الإضاءة' : 'Glow Effect'}
              </p>
              <p className="text-sm text-muted-foreground">
                {lang === 'ar' ? 'إضافة وهج للاسم' : 'Add glow to your name'}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.name_glow}
            onCheckedChange={(checked) => setSettings({ ...settings, name_glow: checked })}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            lang === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChatSettings;
