import React, { useState, useRef } from 'react';
import { X, Loader2, Upload, Trash2, Pin, Eye, Lock, Shield, Image as ImageIcon, Mic } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Room {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  background_url: string | null;
  background_color: string;
  welcome_message: string | null;
  pinned_message: string | null;
  created_by: string;
  is_password_protected?: boolean;
  password_hash?: string | null;
  is_pinned?: boolean;
  is_private?: boolean;
  is_locked?: boolean;
  allow_images?: boolean;
  allow_voice?: boolean;
  allow_youtube?: boolean;
  slow_mode?: number;
  max_message_length?: number;
  max_members?: number;
  min_level?: number;
  allowed_roles?: string[];
  mic_enabled?: boolean;
  mic_count?: number;
}

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onUpdate: () => void;
}

const TABS = ['أساسي', 'الأمان', 'المظهر', 'الشات', 'المايكات'] as const;
type Tab = typeof TABS[number];

const ROLES = [
  { id: 'user',        label: '👤 عضو' },
  { id: 'vip',         label: '⭐ VIP' },
  { id: 'moderator',   label: '🛡️ مشرف' },
  { id: 'admin',       label: '⚡ إدارة' },
  { id: 'super_admin', label: '✨ إدارة عليا' },
  { id: 'site_owner',  label: '🏆 مالك الموقع' },
  { id: 'owner',       label: '✨ المالك الأصلي' },
];

const slowModeOptions = [
  { value: 0,  label: 'بدون تباطؤ' },
  { value: 3,  label: '3 ثواني' },
  { value: 5,  label: '5 ثواني' },
  { value: 10, label: '10 ثواني' },
  { value: 30, label: '30 ثانية' },
  { value: 60, label: 'دقيقة' },
];

const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({ isOpen, onClose, room, onUpdate }) => {
  const { lang } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('أساسي');
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ── تبويب: أساسي ──────────────────────────────────────────────────────────
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || '');
  const [welcomeMessage, setWelcomeMessage] = useState(room.welcome_message || '');
  const [pinnedMessage, setPinnedMessage] = useState(room.pinned_message || '');
  const [isPinned, setIsPinned] = useState(room.is_pinned || false);
  const [bgPreview, setBgPreview] = useState<string | null>(room.background_url || null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // ── تبويب: الأمان ──────────────────────────────────────────────────────────
  const [isPublic, setIsPublic] = useState(!(room.is_private || false));
  const [isLocked, setIsLocked] = useState(room.is_locked || false);
  const [isPasswordProtected, setIsPasswordProtected] = useState(room.is_password_protected || false);
  const [password, setPassword] = useState(room.password_hash || '');
  const [maxMembers, setMaxMembers] = useState(room.max_members || 100);
  const [minLevel, setMinLevel] = useState(room.min_level || 0);
  const [allowedRoles, setAllowedRoles] = useState<string[]>(room.allowed_roles || ['user']);

  // ── تبويب: المظهر ──────────────────────────────────────────────────────────
  const [bgColor, setBgColor] = useState(room.background_color || '#1f2937');
  const [allowImages, setAllowImages] = useState(room.allow_images !== false);
  const [allowVoice, setAllowVoice] = useState(room.allow_voice !== false);
  const [allowYoutube, setAllowYoutube] = useState(room.allow_youtube !== false);

  // ── تبويب: الشات ──────────────────────────────────────────────────────────
  const [slowMode, setSlowMode] = useState(room.slow_mode || 0);
  const [maxMessageLength, setMaxMessageLength] = useState(room.max_message_length || 500);

  // ── تبويب: المايكات ────────────────────────────────────────────────────────
  const [micEnabled, setMicEnabled] = useState(room.mic_enabled || false);
  const [micCount, setMicCount] = useState(room.mic_count || 4);

  if (!isOpen) return null;

  // ── رفع صورة الغرفة الخارجية ──────────────────────────────────────────────
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingIcon(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `rooms/${user.id}/${room.id}_icon.${ext}`;
      const { error } = await supabase.storage.from('chat-media').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      await supabase.from('chat_rooms').update({ icon_url: publicUrl }).eq('id', room.id);
      setIconPreview(publicUrl);
      onUpdate();
      toast.success(lang === 'ar' ? 'تم تحديث الصورة!' : 'Image updated!');
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image');
    } finally {
      setUploadingIcon(false);
    }
  };

  // ── رفع خلفية الدردشة الداخلية ────────────────────────────────────────────
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBg(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `rooms/${user.id}/${room.id}_bg.${ext}`;
      const { error } = await supabase.storage.from('chat-media').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      await supabase.from('chat_rooms').update({ background_url: publicUrl }).eq('id', room.id);
      setBgPreview(publicUrl);
      onUpdate();
      toast.success(lang === 'ar' ? 'تم تحديث الخلفية!' : 'Background updated!');
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل رفع الخلفية' : 'Failed to upload background');
    } finally {
      setUploadingBg(false);
    }
  };

  // ── تبديل رتبة في allowedRoles ────────────────────────────────────────────
  const toggleRole = (roleId: string) => {
    setAllowedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  // ── حفظ جميع الإعدادات ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          background_color: bgColor,
          welcome_message: welcomeMessage.trim() || null,
          pinned_message: pinnedMessage.trim() || null,
          is_pinned: isPinned,
          is_private: !isPublic,
          is_locked: isLocked,
          is_password_protected: isPasswordProtected,
          password_hash: isPasswordProtected ? password : null,
          max_members: maxMembers,
          min_level: minLevel,
          allowed_roles: allowedRoles,
          allow_images: allowImages,
          allow_voice: allowVoice,
          allow_youtube: allowYoutube,
          slow_mode: slowMode,
          max_message_length: maxMessageLength,
          mic_enabled: micEnabled,
          mic_count: micCount,
        })
        .eq('id', room.id);

      if (error) throw error;
      toast.success(lang === 'ar' ? 'تم حفظ التغييرات! ✅' : 'Changes saved!');
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(lang === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // ── حذف الغرفة ────────────────────────────────────────────────────────────
  const handleDeleteRoom = async () => {
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ is_active: false })
        .eq('id', room.id);
      if (error) throw error;
      toast.success(lang === 'ar' ? 'تم حذف الغرفة' : 'Room deleted');
      onClose();
      window.location.href = '/rooms';
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل حذف الغرفة' : 'Failed to delete room');
    }
  };

  // ── مكوّن سطر Switch ─────────────────────────────────────────────────────
  const SwitchRow = ({
    icon, label, checked, onChange,
  }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/95 flex flex-col animate-fade-in">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border glass-dark">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
          <h2 className="text-base font-bold">
            ⚙️ {lang === 'ar' ? 'إعدادات الغرفة' : 'Room Settings'}
          </h2>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === 'ar' ? 'حفظ' : 'Save')}
          </Button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'أساسي'    && '📋 '}
              {tab === 'الأمان'   && '🔐 '}
              {tab === 'المظهر'   && '🎨 '}
              {tab === 'الشات'    && '💬 '}
              {tab === 'المايكات' && '🎤 '}
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ════════════ أساسي ════════════ */}
          {activeTab === 'أساسي' && (
            <>
              {/* اسم الغرفة */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">اسم الغرفة</Label>
                <Input value={name} onChange={e => setName(e.target.value)} maxLength={50} className="bg-muted/40" />
              </div>

              {/* وصف الغرفة */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">وصف الغرفة</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)}
                  maxLength={500} rows={3} className="bg-muted/40 resize-none" />
              </div>

              {/* صورة الغرفة الخارجية */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">صورة الغرفة (الخارجية)</Label>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted ring-2 ring-border">
                    {iconPreview ? (
                      <img src={iconPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => iconInputRef.current?.click()}
                      disabled={uploadingIcon}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-sm"
                    >
                      {uploadingIcon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      رفع صورة
                    </button>
                    <input ref={iconInputRef} type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
                  </div>
                </div>
              </div>

              {/* خلفية الدردشة الداخلية */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">خلفية الدردشة (الداخلية)</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-16 h-16 rounded-xl overflow-hidden ring-2 ring-border cursor-pointer"
                    style={{ backgroundColor: bgColor }}
                    onClick={() => bgInputRef.current?.click()}
                  >
                    {bgPreview ? (
                      <img src={bgPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-white/60" />
                      </div>
                    )}
                    {uploadingBg && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => bgInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      رفع خلفية
                    </button>
                    <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                  </div>
                </div>
                {/* لون الخلفية */}
                <div className="flex items-center gap-3 mt-2">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                  <Input value={bgColor} onChange={e => setBgColor(e.target.value)} dir="ltr"
                    placeholder="#1f2937" className="flex-1 bg-muted/40" />
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
                    onClick={() => { setBgColor('#1f2937'); setBgPreview(null); }}>
                    إزالة
                  </Button>
                </div>
              </div>

              {/* رسالة الترحيب */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">رسالة الترحيب</Label>
                <Textarea value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)}
                  placeholder="اهلا وسهلا بكم..." maxLength={300} rows={2} className="bg-muted/40 resize-none" />
              </div>

              {/* الرسالة المثبتة */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">الرسالة المثبتة</Label>
                <Textarea value={pinnedMessage} onChange={e => setPinnedMessage(e.target.value)}
                  placeholder="رسالة تظهر مثبتة في أعلى الغرفة..." maxLength={300} rows={2} className="bg-muted/40 resize-none" />
              </div>

              {/* تثبيت الغرفة */}
              <SwitchRow icon={<Pin className="w-4 h-4" />} label="تثبيت الغرفة في الأعلى"
                checked={isPinned} onChange={setIsPinned} />
              <p className="text-xs text-muted-foreground px-1">
                الغرف المثبتة تظهر دائماً في أعلى القائمة بغض النظر عن عدد الأعضاء
              </p>
            </>
          )}

          {/* ════════════ الأمان ════════════ */}
          {activeTab === 'الأمان' && (
            <>
              <SwitchRow icon={<Eye className="w-4 h-4" />} label="غرفة عامة"
                checked={isPublic} onChange={setIsPublic} />

              <SwitchRow icon={<Lock className="w-4 h-4" />} label="قفل الغرفة برمز"
                checked={isLocked} onChange={setIsLocked} />

              <SwitchRow icon={<Shield className="w-4 h-4" />} label="حماية بكلمة مرور"
                checked={isPasswordProtected} onChange={setIsPasswordProtected} />
              {isPasswordProtected && (
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور..." className="bg-muted/40" />
              )}

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">الحد الأقصى للأعضاء</Label>
                <Input type="number" value={maxMembers} onChange={e => setMaxMembers(parseInt(e.target.value) || 100)}
                  min={10} max={1000} className="bg-muted/40" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">الحد الأدنى للمستوى</Label>
                <Input type="number" value={minLevel} onChange={e => setMinLevel(parseInt(e.target.value) || 0)}
                  min={0} className="bg-muted/40" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">الرتب المسموح لها بالدخول</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(role => (
                    <button key={role.id} onClick={() => toggleRole(role.id)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        allowedRoles.includes(role.id)
                          ? 'bg-amber-500 text-black'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}>
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ════════════ المظهر ════════════ */}
          {activeTab === 'المظهر' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">لون خلفية الشات</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                  <Input value={bgColor} onChange={e => setBgColor(e.target.value)} dir="ltr"
                    placeholder="#1f2937" className="flex-1 bg-muted/40" />
                  <Button variant="ghost" size="sm" className="text-xs"
                    onClick={() => setBgColor('#1f2937')}>إزالة</Button>
                </div>
              </div>

              <SwitchRow icon={<ImageIcon className="w-4 h-4" />} label="السماح بالصور"
                checked={allowImages} onChange={setAllowImages} />

              <SwitchRow icon={<Mic className="w-4 h-4" />} label="السماح بالصوت"
                checked={allowVoice} onChange={setAllowVoice} />

              <SwitchRow
                icon={<span className="text-red-500 font-bold text-xs">YT</span>}
                label="السماح بيوتيوب"
                checked={allowYoutube} onChange={setAllowYoutube} />
            </>
          )}

          {/* ════════════ الشات ════════════ */}
          {activeTab === 'الشات' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">تباطؤ الرسائل (Slow Mode)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {slowModeOptions.map(opt => (
                    <button key={opt.value} onClick={() => setSlowMode(opt.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        slowMode === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">الحد الأقصى لطول الرسالة</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 300, 500, 1000, 2000, 5000].map(len => (
                    <button key={len} onClick={() => setMaxMessageLength(len)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        maxMessageLength === len
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}>
                      {len}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ════════════ المايكات ════════════ */}
          {activeTab === 'المايكات' && (
            <>
              <SwitchRow icon={<Mic className="w-4 h-4" />} label="تفعيل المايكات"
                checked={micEnabled} onChange={setMicEnabled} />

              {micEnabled && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">عدد المايكات</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 4, 6, 8].map(n => (
                      <button key={n} onClick={() => setMicCount(n)}
                        className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                          micCount === n
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── زر حذف الغرفة (يظهر دائماً في الأسفل) ── */}
          <div className="pt-4 border-t border-border mt-6">
            <Button variant="destructive" className="w-full gap-2" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'حذف الغرفة نهائياً' : 'Delete Room Permanently'}
            </Button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 px-4 py-3 border-t border-border glass-dark">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gradient-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '💾 حفظ'}
          </Button>
        </div>
      </div>

      {/* ── حوار تأكيد الحذف ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === 'ar'
                ? 'سيتم حذف الغرفة وجميع الرسائل نهائياً. لا يمكن التراجع عن هذا الإجراء.'
                : 'This will permanently delete the room and all messages. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom} className="bg-destructive text-destructive-foreground">
              {lang === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RoomSettingsModal;
