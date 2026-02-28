import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Palette, Type, Sparkles, Fish, Heart, Star, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

// ========== TYPES ==========
interface UserSettings {
  name_color: string;
  font_color: string;
  name_bg_color: string;
  name_glow: boolean;
  name_glow_color: string;
  name_effect: 'none' | 'fish' | 'hearts' | 'stars'; // مؤثر متحرك حول الاسم
}

// ========== ANIMATED EFFECT PREVIEW ==========
// هذا المكون يُستخدم في الدردشة العامة لعرض المؤثر حول الاسم
export const AnimatedNameEffect: React.FC<{
  effect: UserSettings['name_effect'];
  color?: string;
}> = ({ effect, color = '#ff69b4' }) => {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; scale: number; opacity: number; angle: number }[]
  >([]);

  useEffect(() => {
    if (effect === 'none') return;

    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      const angle = Math.random() * 360;
      const distance = 20 + Math.random() * 30;
      setParticles((prev) => [
        ...prev.slice(-8), // max 8 particles
        {
          id: counter,
          x: Math.cos((angle * Math.PI) / 180) * distance,
          y: Math.sin((angle * Math.PI) / 180) * distance,
          scale: 0.5 + Math.random() * 0.8,
          opacity: 1,
          angle,
        },
      ]);
    }, 400);

    return () => clearInterval(interval);
  }, [effect]);

  if (effect === 'none') return null;

  const emoji = effect === 'fish' ? '🐟' : effect === 'hearts' ? '💗' : '✨';

  return (
    <span className="relative inline-block pointer-events-none select-none">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-xs animate-ping"
          style={{
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            transform: `translate(-50%, -50%) scale(${p.scale})`,
            animationDuration: '1s',
            animationIterationCount: '1',
            fontSize: '10px',
          }}
        >
          {emoji}
        </span>
      ))}
    </span>
  );
};

// ========== NAME DISPLAY (استخدمه في الدردشة العامة) ==========
// ضع هذا المكون في مكان عرض اسم المستخدم بالدردشة العامة
export const StyledUsername: React.FC<{
  name: string;
  settings: Partial<UserSettings>;
}> = ({ name, settings }) => {
  const {
    name_color = '#ffffff',
    name_bg_color = 'transparent',
    name_glow = false,
    name_glow_color = '#ffffff',
    name_effect = 'none',
  } = settings;

  const glowStyle = name_glow
    ? {
        textShadow: `0 0 8px ${name_glow_color}, 0 0 16px ${name_glow_color}, 0 0 32px ${name_glow_color}`,
      }
    : {};

  return (
    <span className="relative inline-flex items-center gap-1">
      <span
        className="font-semibold px-1 rounded"
        style={{
          color: name_color,
          backgroundColor: name_bg_color !== 'transparent' ? name_bg_color : undefined,
          ...glowStyle,
          transition: 'all 0.3s ease',
        }}
      >
        {name}
      </span>
      <AnimatedNameEffect effect={name_effect} />
    </span>
  );
};

// ========== SETTINGS PAGE ==========
const ChatSettings: React.FC = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();

  const [settings, setSettings] = useState<UserSettings>({
    name_color: '#ffffff',
    font_color: '#ffffff',
    name_bg_color: 'transparent',
    name_glow: false,
    name_glow_color: '#a78bfa',
    name_effect: 'none',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchSettings();
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
          name_bg_color: data.name_bg_color || 'transparent',
          name_glow: data.name_glow || false,
          name_glow_color: data.name_glow_color || '#a78bfa',
          name_effect: data.name_effect || 'none',
        });
      } else {
        await supabase.from('user_settings').insert({ user_id: user?.id });
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
          name_bg_color: settings.name_bg_color,
          name_glow: settings.name_glow,
          name_glow_color: settings.name_glow_color,
          name_effect: settings.name_effect,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success(lang === 'ar' ? 'تم حفظ الإعدادات ✅' : 'Settings saved ✅');
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

  const effects: { value: UserSettings['name_effect']; label: string; emoji: string }[] = [
    { value: 'none', label: lang === 'ar' ? 'بدون' : 'None', emoji: '🚫' },
    { value: 'fish', label: lang === 'ar' ? 'أسماك' : 'Fish', emoji: '🐟' },
    { value: 'hearts', label: lang === 'ar' ? 'قلوب' : 'Hearts', emoji: '💗' },
    { value: 'stars', label: lang === 'ar' ? 'نجوم' : 'Stars', emoji: '✨' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {lang === 'ar' ? 'إعدادات الدردشة' : 'Chat Settings'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ====== LIVE PREVIEW ====== */}
        <div className="p-4 bg-muted rounded-xl border border-border space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            {lang === 'ar' ? '👁 معاينة مباشرة' : '👁 Live Preview'}
          </p>
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
              أ
            </div>
            <div>
              <StyledUsername
                name={lang === 'ar' ? 'اسمك هنا' : 'Your Name'}
                settings={settings}
              />
              <p className="text-sm mt-1" style={{ color: settings.font_color }}>
                {lang === 'ar' ? 'هذا مثال على رسالة في الدردشة العامة' : 'This is a sample chat message'}
              </p>
            </div>
          </div>
        </div>

        {/* ====== NAME COLOR ====== */}
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
            <span className="text-sm text-muted-foreground">{settings.name_color}</span>
          </div>
        </div>

        {/* ====== FONT COLOR ====== */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            {lang === 'ar' ? 'لون الرسالة' : 'Message Color'}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="color"
              value={settings.font_color}
              onChange={(e) => setSettings({ ...settings, font_color: e.target.value })}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">{settings.font_color}</span>
          </div>
        </div>

        {/* ====== NAME BACKGROUND COLOR ====== */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-orange-400" />
            {lang === 'ar' ? 'خلفية الاسم' : 'Name Background'}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="color"
              value={settings.name_bg_color === 'transparent' ? '#000000' : settings.name_bg_color}
              onChange={(e) => setSettings({ ...settings, name_bg_color: e.target.value })}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettings({ ...settings, name_bg_color: 'transparent' })}
              className="text-xs"
            >
              {lang === 'ar' ? 'بدون خلفية' : 'No BG'}
            </Button>
            <span className="text-sm text-muted-foreground">{settings.name_bg_color}</span>
          </div>
        </div>

        {/* ====== GLOW EFFECT ====== */}
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="font-medium">
                  {lang === 'ar' ? 'تهويج الاسم (Glow)' : 'Name Glow Effect'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lang === 'ar' ? 'يضيف وهج/تهويج حول الاسم' : 'Adds a glow around your name'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.name_glow}
              onCheckedChange={(checked) => setSettings({ ...settings, name_glow: checked })}
            />
          </div>
          {settings.name_glow && (
            <div className="flex items-center gap-3 pt-1">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                {lang === 'ar' ? 'لون التهويج:' : 'Glow color:'}
              </Label>
              <Input
                type="color"
                value={settings.name_glow_color}
                onChange={(e) => setSettings({ ...settings, name_glow_color: e.target.value })}
                className="w-12 h-8 p-1 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* ====== ANIMATED EFFECT ====== */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-400" />
            {lang === 'ar' ? 'مؤثر متحرك حول الاسم' : 'Animated Effect Around Name'}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {effects.map((eff) => (
              <button
                key={eff.value}
                onClick={() => setSettings({ ...settings, name_effect: eff.value })}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all
                  ${settings.name_effect === eff.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 hover:bg-muted'
                  }`}
              >
                <span className="text-lg">{eff.emoji}</span>
                {eff.label}
              </button>
            ))}
          </div>
        </div>

        {/* ====== SAVE BUTTON ====== */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            lang === 'ar' ? '💾 حفظ الإعدادات' : '💾 Save Settings'
          )}
        </Button>

        {/* ====== HOW TO USE NOTE ====== */}
        <div className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1">
          <p className="font-semibold text-blue-400">
            {lang === 'ar' ? '📌 كيف تشتغل الألوان على الدردشة العامة؟' : '📌 How colors apply to public chat?'}
          </p>
          <p>
            {lang === 'ar'
              ? 'استخدم مكون <StyledUsername> و font_color من الـ settings في مكون الدردشة العامة لتطبيق الألوان تلقائياً.'
              : 'Use the <StyledUsername> component and font_color from settings in your public chat component to apply colors automatically.'}
          </p>
        </div>

      </CardContent>
    </Card>
  );
};

export default ChatSettings;


// ========================================================
// كيف تستخدم هذا في الدردشة العامة؟
// ========================================================
// 
// 1. في مكون الرسالة بالدردشة العامة، احضر settings المستخدم من Supabase:
//
//    const { data: userSettings } = await supabase
//      .from('user_settings')
//      .select('*')
//      .eq('user_id', message.user_id)
//      .maybeSingle();
//
// 2. اعرض الاسم هكذا:
//    <StyledUsername name={message.username} settings={userSettings} />
//
// 3. اعرض نص الرسالة هكذا:
//    <p style={{ color: userSettings?.font_color || '#ffffff' }}>
//      {message.text}
//    </p>
//
// 3. تأكد إن جدول user_settings عنده هذه الأعمدة الجديدة:
//    - name_bg_color (text, default: 'transparent')
//    - name_glow_color (text, default: '#a78bfa')  
//    - name_effect (text, default: 'none')
// ========================================================
