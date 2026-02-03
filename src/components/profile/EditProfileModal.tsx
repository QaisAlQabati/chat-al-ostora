import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Loader2, Palette } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const countries = [
  { code: 'SA', name_ar: 'السعودية', name_en: 'Saudi Arabia' },
  { code: 'AE', name_ar: 'الإمارات', name_en: 'UAE' },
  { code: 'EG', name_ar: 'مصر', name_en: 'Egypt' },
  { code: 'JO', name_ar: 'الأردن', name_en: 'Jordan' },
  { code: 'KW', name_ar: 'الكويت', name_en: 'Kuwait' },
  { code: 'QA', name_ar: 'قطر', name_en: 'Qatar' },
  { code: 'BH', name_ar: 'البحرين', name_en: 'Bahrain' },
  { code: 'OM', name_ar: 'عمان', name_en: 'Oman' },
  { code: 'LB', name_ar: 'لبنان', name_en: 'Lebanon' },
  { code: 'IQ', name_ar: 'العراق', name_en: 'Iraq' },
];

const colorPresets = [
  '#ffffff', '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', 
  '#54a0ff', '#5f27cd', '#00d2d3', '#1dd1a1', '#ff9f43',
  '#ee5253', '#10ac84', '#2e86de', '#f368e0', '#ff6b6b',
];

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { lang } = useLanguage();
  const { profile, user, refreshProfile } = useAuth();
  
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [city, setCity] = useState(profile?.city || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  // Chat customization
  const [nameColor, setNameColor] = useState('#ffffff');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [nameBackground, setNameBackground] = useState('transparent');
  const [nameGlow, setNameGlow] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load user settings
  useEffect(() => {
    if (user && isOpen) {
      loadSettings();
    }
  }, [user, isOpen]);

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setNameColor(data.name_color || '#ffffff');
      setFontColor(data.font_color || '#ffffff');
      setNameGlow(data.name_glow || false);
    }
  };

  if (!isOpen || !profile) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ profile_picture: publicUrl })
        .eq('user_id', user.id);

      await refreshProfile();
      toast.success(lang === 'ar' ? 'تم تحديث الصورة!' : 'Photo updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(lang === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/cover-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-backgrounds')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-backgrounds')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ cover_picture: publicUrl })
        .eq('user_id', user.id);

      await refreshProfile();
      toast.success(lang === 'ar' ? 'تم تحديث الغلاف!' : 'Cover updated!');
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error(lang === 'ar' ? 'فشل رفع الغلاف' : 'Failed to upload cover');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          username,
          bio,
          country,
          city,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update or create user settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          name_color: nameColor,
          font_color: fontColor,
          name_glow: nameGlow,
        }, { onConflict: 'user_id' });

      if (settingsError) console.error('Settings error:', settingsError);

      await refreshProfile();
      toast.success(lang === 'ar' ? 'تم حفظ التغييرات!' : 'Changes saved!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      if (error.code === '23505') {
        toast.error(lang === 'ar' ? 'اسم المستخدم مستخدم بالفعل' : 'Username already taken');
      } else {
        toast.error(lang === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 animate-fade-in overflow-y-auto">
      <div className="min-h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border glass-dark z-10">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
          <h2 className="text-lg font-semibold">
            {lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}
          </h2>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === 'ar' ? 'حفظ' : 'Save')}
          </Button>
        </div>

        <div className="flex-1 p-4 space-y-6">
          {/* Cover Photo */}
          <div className="space-y-2">
            <Label>{lang === 'ar' ? 'صورة الغلاف' : 'Cover Photo'}</Label>
            <div 
              className="h-32 bg-muted rounded-xl relative overflow-hidden cursor-pointer"
              onClick={() => coverInputRef.current?.click()}
            >
              {profile.cover_picture && (
                <img src={profile.cover_picture} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {uploadingCover ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Avatar */}
          <div className="space-y-2">
            <Label>{lang === 'ar' ? 'الصورة الشخصية' : 'Profile Photo'}</Label>
            <div 
              className="w-24 h-24 rounded-full bg-muted relative overflow-hidden cursor-pointer mx-auto"
              onClick={() => avatarInputRef.current?.click()}
            >
              {profile.profile_picture ? (
                <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-primary-foreground text-2xl font-bold">
                  {displayName[0] || 'U'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">{lang === 'ar' ? 'الاسم المعروض' : 'Display Name'}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">{lang === 'ar' ? 'اسم المستخدم' : 'Username'}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              maxLength={50}
              dir="ltr"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">{lang === 'ar' ? 'النبذة التعريفية' : 'Bio'}</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label>{lang === 'ar' ? 'الدولة' : 'Country'}</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder={lang === 'ar' ? 'اختر الدولة' : 'Select country'} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={lang === 'ar' ? c.name_ar : c.name_en}>
                    {lang === 'ar' ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">{lang === 'ar' ? 'المدينة' : 'City'}</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Chat Customization Section */}
          <div className="border-t border-border pt-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">
                {lang === 'ar' ? 'تخصيص الدردشة' : 'Chat Customization'}
              </h3>
            </div>

            {/* Name Color */}
            <div className="space-y-3 mb-4">
              <Label>{lang === 'ar' ? 'لون الاسم' : 'Name Color'}</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNameColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      nameColor === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Input
                  type="color"
                  value={nameColor}
                  onChange={(e) => setNameColor(e.target.value)}
                  className="w-8 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Font Color */}
            <div className="space-y-3 mb-4">
              <Label>{lang === 'ar' ? 'لون الخط' : 'Font Color'}</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFontColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      fontColor === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Input
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="w-8 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Name Background */}
            <div className="space-y-3 mb-4">
              <Label>{lang === 'ar' ? 'خلفية الاسم' : 'Name Background'}</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setNameBackground('transparent')}
                  className={`w-8 h-8 rounded-full border-2 transition-all bg-muted ${
                    nameBackground === 'transparent' ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                >
                  <span className="text-xs">✕</span>
                </button>
                {colorPresets.slice(0, 10).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNameBackground(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      nameBackground === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Name Glow */}
            <div className="flex items-center justify-between">
              <Label>{lang === 'ar' ? 'توهج الاسم' : 'Name Glow'}</Label>
              <Switch checked={nameGlow} onCheckedChange={setNameGlow} />
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <Label className="mb-2 block">{lang === 'ar' ? 'معاينة' : 'Preview'}</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">•••</span>
                <span
                  className="px-2 py-0.5 rounded-md font-medium"
                  style={{ 
                    backgroundColor: nameBackground !== 'transparent' ? nameBackground : 'hsl(var(--muted))',
                    color: nameColor,
                    textShadow: nameGlow ? `0 0 10px ${nameColor}` : 'none',
                  }}
                >
                  {displayName || 'Your Name'}
                </span>
                <span className="text-muted-foreground">:</span>
                <span style={{ color: fontColor }}>
                  {lang === 'ar' ? 'مرحباً بالجميع!' : 'Hello everyone!'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
