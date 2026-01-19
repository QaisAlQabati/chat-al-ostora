import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, Lock, Mic, Gamepad2, Music, Gift, 
  MessageSquare, Image, Save, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveSettings {
  id?: string;
  user_id: string;
  max_mic_count: number;
  is_password_protected: boolean;
  password_hash?: string;
  allow_music: boolean;
  allow_games: boolean;
  allow_gifts: boolean;
  chat_enabled: boolean;
  background_url?: string;
}

interface LiveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: LiveSettings) => void;
}

const LiveSettingsModal: React.FC<LiveSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<LiveSettings>({
    user_id: user?.id || '',
    max_mic_count: 4,
    is_password_protected: false,
    allow_music: true,
    allow_games: true,
    allow_gifts: true,
    chat_enabled: true,
  });
  
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchSettings();
    }
  }, [isOpen, user]);

  const fetchSettings = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('live_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const updatedSettings = {
        ...settings,
        user_id: user.id,
        password_hash: password || settings.password_hash,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('live_settings')
        .upsert(updatedSettings);

      if (error) throw error;

      toast.success(lang === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
      onSave(updatedSettings);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(lang === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {lang === 'ar' ? 'إعدادات البث' : 'Live Settings'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mic Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  {lang === 'ar' ? 'عدد المايكات' : 'Number of Mics'}
                </Label>
                <span className="text-sm font-bold text-primary">{settings.max_mic_count}</span>
              </div>
              <Slider
                value={[settings.max_mic_count]}
                onValueChange={([value]) => setSettings({ ...settings, max_mic_count: value })}
                min={1}
                max={4}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
              </div>
            </div>

            {/* Password Protection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {lang === 'ar' ? 'حماية بكلمة مرور' : 'Password Protection'}
                </Label>
                <Switch
                  checked={settings.is_password_protected}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_password_protected: checked })}
                />
              </div>
              {settings.is_password_protected && (
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                />
              )}
            </div>

            {/* Allow Music */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                {lang === 'ar' ? 'السماح بالموسيقى' : 'Allow Music'}
              </Label>
              <Switch
                checked={settings.allow_music}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_music: checked })}
              />
            </div>

            {/* Allow Games */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                {lang === 'ar' ? 'السماح بالألعاب' : 'Allow Games'}
              </Label>
              <Switch
                checked={settings.allow_games}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_games: checked })}
              />
            </div>

            {/* Allow Gifts */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                {lang === 'ar' ? 'السماح بالهدايا' : 'Allow Gifts'}
              </Label>
              <Switch
                checked={settings.allow_gifts}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_gifts: checked })}
              />
            </div>

            {/* Chat Enabled */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {lang === 'ar' ? 'تفعيل الدردشة' : 'Enable Chat'}
              </Label>
              <Switch
                checked={settings.chat_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, chat_enabled: checked })}
              />
            </div>

            {/* Background URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                {lang === 'ar' ? 'خلفية البث' : 'Live Background'}
              </Label>
              <Input
                value={settings.background_url || ''}
                onChange={(e) => setSettings({ ...settings, background_url: e.target.value })}
                placeholder={lang === 'ar' ? 'رابط الصورة' : 'Image URL'}
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {lang === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LiveSettingsModal;
