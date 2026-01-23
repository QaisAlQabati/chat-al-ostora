import React, { useState } from 'react';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const roomIcons = ['🏠', '🎮', '⚽', '🎵', '🎬', '📚', '💬', '🌟', '🔥', '💎', '👑', '🎯'];

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏠');
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e');
  const [maxMembers, setMaxMembers] = useState(100);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      toast.error(lang === 'ar' ? 'يرجى إدخال اسم الغرفة' : 'Please enter room name');
      return;
    }

    setSaving(true);
    try {
      const { data: room, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          background_color: backgroundColor,
          max_members: maxMembers,
          is_password_protected: isPasswordProtected,
          password_hash: isPasswordProtected ? password : null,
          welcome_message: welcomeMessage.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner
      await supabase
        .from('chat_room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'owner',
        });

      toast.success(lang === 'ar' ? 'تم إنشاء الغرفة بنجاح!' : 'Room created successfully!');
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error(lang === 'ar' ? 'فشل إنشاء الغرفة' : 'Failed to create room');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('🏠');
    setBackgroundColor('#1a1a2e');
    setMaxMembers(100);
    setIsPasswordProtected(false);
    setPassword('');
    setWelcomeMessage('');
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
            {lang === 'ar' ? 'إنشاء غرفة جديدة' : 'Create New Room'}
          </h2>
          <Button onClick={handleCreate} disabled={saving} className="gradient-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === 'ar' ? 'إنشاء' : 'Create')}
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
              placeholder={lang === 'ar' ? 'أدخل اسم الغرفة...' : 'Enter room name...'}
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
              placeholder={lang === 'ar' ? 'وصف اختياري...' : 'Optional description...'}
              maxLength={200}
              rows={2}
            />
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

          {/* Max Members */}
          <div className="space-y-2">
            <Label htmlFor="maxMembers">{lang === 'ar' ? 'الحد الأقصى للأعضاء' : 'Max Members'}</Label>
            <Input
              id="maxMembers"
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value) || 100)}
              min={10}
              max={1000}
            />
          </div>

          {/* Password Protection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{lang === 'ar' ? 'حماية بكلمة مرور' : 'Password Protection'}</Label>
              <Switch
                checked={isPasswordProtected}
                onCheckedChange={setIsPasswordProtected}
              />
            </div>
            {isPasswordProtected && (
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={lang === 'ar' ? 'أدخل كلمة المرور...' : 'Enter password...'}
              />
            )}
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">{lang === 'ar' ? 'رسالة الترحيب' : 'Welcome Message'}</Label>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder={lang === 'ar' ? 'رسالة ترحيبية تظهر للداخلين الجدد...' : 'Welcome message for new members...'}
              maxLength={300}
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomModal;
