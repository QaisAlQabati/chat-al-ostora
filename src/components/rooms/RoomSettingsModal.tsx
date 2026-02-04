import React, { useState, useRef } from 'react';
import { X, Loader2, Upload, Trash2, Pin } from 'lucide-react';
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
}

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onUpdate: () => void;
}

const roomIcons = ['🏠', '🎮', '⚽', '🎵', '🎬', '📚', '💬', '🌟', '🔥', '💎', '👑', '🎯'];

const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  room,
  onUpdate,
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || '');
  const [icon, setIcon] = useState(room.icon);
  const [backgroundColor, setBackgroundColor] = useState(room.background_color);
  const [welcomeMessage, setWelcomeMessage] = useState(room.welcome_message || '');
  const [pinnedMessage, setPinnedMessage] = useState(room.pinned_message || '');
  const [isPasswordProtected, setIsPasswordProtected] = useState(room.is_password_protected || false);
  const [password, setPassword] = useState(room.password_hash || '');
  const [isPinned, setIsPinned] = useState(room.is_pinned || false);
  const [saving, setSaving] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const bgInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingBg(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${room.id}/background.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-backgrounds')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-backgrounds')
        .getPublicUrl(fileName);

      await supabase
        .from('chat_rooms')
        .update({ background_url: publicUrl })
        .eq('id', room.id);

      onUpdate();
      toast.success(lang === 'ar' ? 'تم تحديث الخلفية!' : 'Background updated!');
    } catch (error) {
      console.error('Error uploading background:', error);
      toast.error(lang === 'ar' ? 'فشل رفع الخلفية' : 'Failed to upload background');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          background_color: backgroundColor,
          welcome_message: welcomeMessage.trim() || null,
          pinned_message: pinnedMessage.trim() || null,
          is_password_protected: isPasswordProtected,
          password_hash: isPasswordProtected ? password : null,
          is_pinned: isPinned,
        })
        .eq('id', room.id);

      if (error) throw error;

      toast.success(lang === 'ar' ? 'تم حفظ التغييرات!' : 'Changes saved!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error(lang === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

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
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error(lang === 'ar' ? 'فشل حذف الغرفة' : 'Failed to delete room');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/95 animate-fade-in overflow-y-auto">
        <div className="min-h-full flex flex-col">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border glass-dark z-10">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-6 h-6" />
            </Button>
            <h2 className="text-lg font-semibold">
              {lang === 'ar' ? 'إعدادات الغرفة' : 'Room Settings'}
            </h2>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === 'ar' ? 'حفظ' : 'Save')}
            </Button>
          </div>

          <div className="flex-1 p-4 space-y-6">
            {/* Room Icon */}
            <div className="space-y-2">
              <Label>{lang === 'ar' ? 'أيقونة الغرفة' : 'Room Icon'}</Label>
              <div className="flex flex-wrap gap-2">
                {roomIcons.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                      icon === emoji
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{lang === 'ar' ? 'اسم الغرفة' : 'Room Name'}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{lang === 'ar' ? 'وصف الغرفة' : 'Description'}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
              />
            </div>

            {/* Background Image */}
            <div className="space-y-2">
              <Label>{lang === 'ar' ? 'صورة الخلفية' : 'Background Image'}</Label>
              <div
                className="h-32 bg-muted rounded-xl relative overflow-hidden cursor-pointer"
                onClick={() => bgInputRef.current?.click()}
                style={{
                  backgroundColor: backgroundColor,
                  backgroundImage: room.background_url ? `url(${room.background_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  {uploadingBg ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-white" />
                  )}
                </div>
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label>{lang === 'ar' ? 'لون الخلفية' : 'Background Color'}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-0"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Welcome Message */}
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">{lang === 'ar' ? 'رسالة الترحيب' : 'Welcome Message'}</Label>
              <Textarea
                id="welcomeMessage"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                maxLength={300}
                rows={2}
              />
            </div>

            {/* Pinned Message */}
            <div className="space-y-2">
              <Label htmlFor="pinnedMessage">{lang === 'ar' ? 'رسالة مثبتة' : 'Pinned Message'}</Label>
              <Textarea
                id="pinnedMessage"
                value={pinnedMessage}
                onChange={(e) => setPinnedMessage(e.target.value)}
                maxLength={300}
                rows={2}
              />
            </div>

            {/* Password Protection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{lang === 'ar' ? 'حماية بكلمة سر' : 'Password Protection'}</Label>
                <Switch
                  checked={isPasswordProtected}
                  onCheckedChange={setIsPasswordProtected}
                />
              </div>
              {isPasswordProtected && (
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'ar' ? 'أدخل كلمة السر...' : 'Enter password...'}
                />
              )}
            </div>

            {/* Pin Room */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-primary" />
                  <Label>{lang === 'ar' ? 'تثبيت الغرفة في الأعلى' : 'Pin Room to Top'}</Label>
                </div>
                <Switch
                  checked={isPinned}
                  onCheckedChange={setIsPinned}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === 'ar' 
                  ? 'الغرف المثبتة تظهر دائماً في أعلى القائمة بغض النظر عن عدد الأعضاء'
                  : 'Pinned rooms always appear at the top regardless of member count'}
              </p>
            </div>

            <div className="pt-6 border-t border-border">
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
                {lang === 'ar' ? 'حذف الغرفة نهائياً' : 'Delete Room Permanently'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogCancel>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
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
