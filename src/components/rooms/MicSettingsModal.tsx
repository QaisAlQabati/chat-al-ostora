import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Lock, Unlock, Volume2, Music, Clock, Award } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { RoomMicSettings } from '@/hooks/useRoomMics';

interface MicSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  settings: RoomMicSettings | null;
  onSave: (settings: Partial<RoomMicSettings>) => Promise<boolean>;
}

const MicSettingsModal: React.FC<MicSettingsModalProps> = ({
  isOpen,
  onClose,
  roomName,
  settings,
  onSave,
}) => {
  const { lang } = useLanguage();
  const [saving, setSaving] = useState(false);
  
  const [micEnabled, setMicEnabled] = useState(true);
  const [micCount, setMicCount] = useState(4);
  const [micTimeLimit, setMicTimeLimit] = useState(300);
  const [allowMicRequests, setAllowMicRequests] = useState(true);
  const [allowSongs, setAllowSongs] = useState(true);
  const [micPointsReward, setMicPointsReward] = useState(50);
  const [isLocked, setIsLocked] = useState(false);
  const [isChatMuted, setIsChatMuted] = useState(false);

  useEffect(() => {
    if (settings) {
      setMicEnabled(settings.mic_enabled);
      setMicCount(settings.mic_count);
      setMicTimeLimit(settings.mic_time_limit);
      setAllowMicRequests(settings.allow_mic_requests);
      setAllowSongs(settings.allow_songs);
      setMicPointsReward(settings.mic_points_reward);
      setIsLocked(settings.is_locked);
      setIsChatMuted(settings.is_chat_muted);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave({
      mic_enabled: micEnabled,
      mic_count: micCount,
      mic_time_limit: micTimeLimit,
      allow_mic_requests: allowMicRequests,
      allow_songs: allowSongs,
      mic_points_reward: micPointsReward,
      is_locked: isLocked,
      is_chat_muted: isChatMuted,
    });
    setSaving(false);
    if (success) onClose();
  };

  const timeLimitOptions = [
    { value: 180, label: lang === 'ar' ? '3 دقائق' : '3 min' },
    { value: 300, label: lang === 'ar' ? '5 دقائق' : '5 min' },
    { value: 600, label: lang === 'ar' ? '10 دقائق' : '10 min' },
    { value: 0, label: lang === 'ar' ? 'غير محدود' : 'Unlimited' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 animate-fade-in overflow-y-auto">
      <div className="min-h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border glass-dark z-10">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              {lang === 'ar' ? 'إعدادات المايكات' : 'Mic Settings'}
            </h2>
            <p className="text-xs text-muted-foreground">{roomName}</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary">
            {saving ? '...' : (lang === 'ar' ? 'حفظ' : 'Save')}
          </Button>
        </div>

        <div className="flex-1 p-4 space-y-6">
          {/* Info Banner */}
          <div className="bg-primary/10 rounded-xl p-3 text-sm">
            <p className="text-center text-muted-foreground">
              {lang === 'ar' 
                ? '📍 هذه الإعدادات خاصة بهذه الغرفة فقط ولن تؤثر على الغرف الأخرى'
                : '📍 These settings are specific to this room only'}
            </p>
          </div>

          {/* Mic Visibility */}
          <div className="glass-card rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {micEnabled ? (
                  <Mic className="w-5 h-5 text-green-500" />
                ) : (
                  <MicOff className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <Label className="text-base font-medium">
                    {lang === 'ar' ? 'حالة المايكات' : 'Mic Status'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'إظهار أو إخفاء المايكات' : 'Show or hide mics'}
                  </p>
                </div>
              </div>
              <Switch checked={micEnabled} onCheckedChange={setMicEnabled} />
            </div>
          </div>

          {/* Mic Count */}
          {micEnabled && (
            <div className="glass-card rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">
                  {lang === 'ar' ? 'عدد المايكات' : 'Number of Mics'}: {micCount}
                </Label>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[2, 4, 6, 8].map((count) => (
                  <Button
                    key={count}
                    variant={micCount === count ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMicCount(count)}
                    className="min-w-12"
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Time Limit */}
          {micEnabled && (
            <div className="glass-card rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <Label className="text-base font-medium">
                  {lang === 'ar' ? 'الوقت المسموح' : 'Time Limit'}
                </Label>
              </div>
              <RadioGroup
                value={String(micTimeLimit)}
                onValueChange={(v) => setMicTimeLimit(Number(v))}
                className="flex flex-wrap gap-3"
              >
                {timeLimitOptions.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={String(opt.value)} id={`time-${opt.value}`} />
                    <Label htmlFor={`time-${opt.value}`} className="cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Additional Settings */}
          {micEnabled && (
            <div className="glass-card rounded-xl p-4 space-y-4">
              <h3 className="font-medium mb-3">
                {lang === 'ar' ? 'إعدادات إضافية' : 'Additional Settings'}
              </h3>

              <div className="flex items-center justify-between">
                <Label>{lang === 'ar' ? 'السماح بطلب المايك' : 'Allow Mic Requests'}</Label>
                <Switch checked={allowMicRequests} onCheckedChange={setAllowMicRequests} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  <Label>{lang === 'ar' ? 'تفعيل الأغاني' : 'Enable Songs'}</Label>
                </div>
                <Switch checked={allowSongs} onCheckedChange={setAllowSongs} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <Label>
                    {lang === 'ar' ? 'النقاط عند الصعود' : 'Points Reward'}: {micPointsReward}
                  </Label>
                </div>
                <Slider
                  value={[micPointsReward]}
                  min={0}
                  max={200}
                  step={10}
                  onValueChange={(v) => setMicPointsReward(v[0])}
                />
              </div>
            </div>
          )}

          {/* Room Controls */}
          <div className="glass-card rounded-xl p-4 space-y-4">
            <h3 className="font-medium mb-3">
              {lang === 'ar' ? 'التحكم بالغرفة' : 'Room Controls'}
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLocked ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4 text-green-500" />}
                <div>
                  <Label>{lang === 'ar' ? 'قفل الغرفة' : 'Lock Room'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'منع الدخول للغرفة' : 'Prevent new entries'}
                  </p>
                </div>
              </div>
              <Switch checked={isLocked} onCheckedChange={setIsLocked} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isChatMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-green-500" />}
                <div>
                  <Label>{lang === 'ar' ? 'كتم الدردشة' : 'Mute Chat'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'منع الكتابة في الدردشة' : 'Prevent messages'}
                  </p>
                </div>
              </div>
              <Switch checked={isChatMuted} onCheckedChange={setIsChatMuted} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicSettingsModal;
