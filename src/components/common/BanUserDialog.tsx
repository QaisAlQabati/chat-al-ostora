import React, { useState } from 'react';
import { Ban, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BanUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
  onBanned?: () => void;
}

const BanUserDialog: React.FC<BanUserDialogProps> = ({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
  onBanned,
}) => {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();

  const isOwner = profile?.role === 'owner';

  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('permanent');
  const [isXBan, setIsXBan] = useState(false);
  const [loading, setLoading] = useState(false);

  const getDurationDate = () => {
    const now = new Date();
    switch (duration) {
      case '1h': return new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString();
      case '12h': return new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
      case '1d': return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case '3d': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      case '7d': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'permanent': return null;
      default: return null;
    }
  };

  const handleBan = async () => {
    if (!reason.trim()) {
      toast.error(lang === 'ar' ? 'يجب كتابة سبب الحظر' : 'Ban reason is required');
      return;
    }

    setLoading(true);
    try {
      const banData: any = {
        is_banned: true,
        ban_reason: reason.trim(),
        banned_by: user?.id,
        banned_at: new Date().toISOString(),
        ban_expires_at: getDurationDate(),
        is_xban: isOwner && isXBan,
      };

      const { error } = await supabase
        .from('profiles')
        .update(banData)
        .eq('id', targetUserId);

      if (error) throw error;

      // Log ban action on target's profile activity
      await supabase.from('ban_logs').insert({
        banned_user_id: targetUserId,
        banned_by_user_id: user?.id,
        reason: reason.trim(),
        is_xban: isOwner && isXBan,
        expires_at: getDurationDate(),
        created_at: new Date().toISOString(),
      });

      toast.success(
        isXBan
          ? (lang === 'ar' ? `تم تطبيق X-Ban على ${targetUsername}` : `X-Ban applied to ${targetUsername}`)
          : (lang === 'ar' ? `تم حظر ${targetUsername} بنجاح` : `${targetUsername} has been banned`)
      );

      onOpenChange(false);
      onBanned?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="w-5 h-5" />
            {lang === 'ar' ? `حظر المستخدم: ${targetUsername}` : `Ban User: ${targetUsername}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reason - Required */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              {lang === 'ar' ? 'سبب الحظر *' : 'Ban Reason *'}
              <span className="text-destructive ml-1">({lang === 'ar' ? 'إجباري' : 'Required'})</span>
            </Label>
            <Textarea
              placeholder={lang === 'ar' ? 'اكتب سبب الحظر بوضوح...' : 'Write the ban reason clearly...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Duration */}
          {!isXBan && (
            <div className="space-y-2">
              <Label>{lang === 'ar' ? 'مدة الحظر' : 'Ban Duration'}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">{lang === 'ar' ? 'ساعة واحدة' : '1 Hour'}</SelectItem>
                  <SelectItem value="12h">{lang === 'ar' ? '12 ساعة' : '12 Hours'}</SelectItem>
                  <SelectItem value="1d">{lang === 'ar' ? 'يوم واحد' : '1 Day'}</SelectItem>
                  <SelectItem value="3d">{lang === 'ar' ? '3 أيام' : '3 Days'}</SelectItem>
                  <SelectItem value="7d">{lang === 'ar' ? 'أسبوع' : '1 Week'}</SelectItem>
                  <SelectItem value="30d">{lang === 'ar' ? 'شهر' : '1 Month'}</SelectItem>
                  <SelectItem value="permanent">{lang === 'ar' ? 'دائم' : 'Permanent'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* X-Ban Toggle - Only for Owners */}
          {isOwner && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <Label className="font-bold text-purple-400">X-Ban</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lang === 'ar'
                    ? 'حظر نهائي مرتبط بالجهاز والشبكة - لا يمكن تجاوزه حتى بعد مسح البيانات'
                    : 'Permanent ban tied to device & network - cannot be bypassed even after clearing data'}
                </p>
              </div>
              <Switch
                checked={isXBan}
                onCheckedChange={setIsXBan}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleBan}
            disabled={loading || !reason.trim()}
            className={isXBan ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {loading
              ? (lang === 'ar' ? 'جاري...' : 'Processing...')
              : isXBan
                ? (lang === 'ar' ? '🚫 تطبيق X-Ban' : '🚫 Apply X-Ban')
                : (lang === 'ar' ? 'حظر المستخدم' : 'Ban User')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BanUserDialog;
