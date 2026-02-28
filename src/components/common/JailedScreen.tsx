import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Lock, AlertTriangle, MoreHorizontal, Coins, Gift, ShieldAlert, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface JailedScreenProps {
  roomName?: string;
}

// ── قائمة إجراءات المستخدم ─────────────────────────────────────────────────
interface UserActionsMenuProps {
  targetUserId: string;
  targetName: string;
  onClose: () => void;
}

const UserActionsMenu: React.FC<UserActionsMenuProps> = ({ targetUserId, targetName, onClose }) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { permissions } = useUserRole();

  const [view, setView] = useState<'menu' | 'points' | 'gift' | 'jail'>('menu');
  const [pointsAmount, setPointsAmount] = useState('');
  const [giftName, setGiftName] = useState('');
  const [jailRoomId, setJailRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  // إرسال نقاط
  const sendPoints = async () => {
    const amount = parseInt(pointsAmount);
    if (!amount || amount <= 0 || !user) return;
    setLoading(true);
    try {
      // خصم من المرسل وإضافة للمستقبل
      const { error } = await supabase.rpc('transfer_points', {
        sender_id: user.id,
        receiver_id: targetUserId,
        amount,
      });
      if (error) throw error;
      toast.success(lang === 'ar' ? `تم إرسال ${amount} نقطة إلى ${targetName}` : `Sent ${amount} points to ${targetName}`);
      onClose();
    } catch (err: any) {
      toast.error(lang === 'ar' ? 'فشل إرسال النقاط' : 'Failed to send points');
    } finally {
      setLoading(false);
    }
  };

  // إرسال هدية
  const sendGift = async () => {
    if (!giftName.trim() || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('gifts').insert({
        sender_id: user.id,
        receiver_id: targetUserId,
        gift_name: giftName.trim(),
      });
      if (error) throw error;
      toast.success(lang === 'ar' ? `تم إرسال الهدية إلى ${targetName} 🎁` : `Gift sent to ${targetName} 🎁`);
      onClose();
    } catch (err: any) {
      toast.error(lang === 'ar' ? 'فشل إرسال الهدية' : 'Failed to send gift');
    } finally {
      setLoading(false);
    }
  };

  // إرسال إلى السجن
  const sendToJail = async () => {
    if (!jailRoomId.trim() || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ jailed_in_room: jailRoomId.trim() })
        .eq('user_id', targetUserId);
      if (error) throw error;
      toast.success(lang === 'ar' ? `تم إرسال ${targetName} إلى السجن ⛓️` : `${targetName} has been jailed ⛓️`);
      onClose();
    } catch (err: any) {
      toast.error(lang === 'ar' ? 'فشل إرسال إلى السجن' : 'Failed to jail user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-card rounded-t-2xl p-4 pb-8 space-y-3 animate-in slide-in-from-bottom-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-base">
            {view === 'menu'   && (lang === 'ar' ? `إجراءات مع ${targetName}` : `Actions for ${targetName}`)}
            {view === 'points' && (lang === 'ar' ? '💰 إرسال نقاط' : '💰 Send Points')}
            {view === 'gift'   && (lang === 'ar' ? '🎁 إرسال هدية' : '🎁 Send Gift')}
            {view === 'jail'   && (lang === 'ar' ? '⛓️ إرسال إلى السجن' : '⛓️ Send to Jail')}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={view === 'menu' ? onClose : () => setView('menu')}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* ── القائمة الرئيسية ── */}
        {view === 'menu' && (
          <div className="space-y-2">
            {/* إرسال نقاط */}
            <button onClick={() => setView('points')}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-right">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">{lang === 'ar' ? 'إرسال نقاط' : 'Send Points'}</p>
                <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'أرسل نقاطاً من رصيدك' : 'Send points from your balance'}</p>
              </div>
            </button>

            {/* إرسال هدية */}
            <button onClick={() => setView('gift')}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-right">
              <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">{lang === 'ar' ? 'إرسال هدية' : 'Send Gift'}</p>
                <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'أرسل هدية رمزية' : 'Send a virtual gift'}</p>
              </div>
            </button>

            {/* إرسال إلى السجن - للإدارة فقط */}
            {permissions.canMuteUsers && (
              <button onClick={() => setView('jail')}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-colors text-right">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-destructive">{lang === 'ar' ? 'إرسال إلى السجن' : 'Send to Jail'}</p>
                  <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'حبس المستخدم في غرفة معينة' : 'Jail user in a specific room'}</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* ── إرسال نقاط ── */}
        {view === 'points' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === 'ar' ? 'عدد النقاط' : 'Points Amount'}</Label>
              <Input type="number" value={pointsAmount} onChange={e => setPointsAmount(e.target.value)}
                placeholder="100" min={1} className="bg-muted/40 text-center text-lg font-bold" />
            </div>
            <Button onClick={sendPoints} disabled={loading || !pointsAmount} className="w-full gradient-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `💰 ${lang === 'ar' ? 'إرسال' : 'Send'}`}
            </Button>
          </div>
        )}

        {/* ── إرسال هدية ── */}
        {view === 'gift' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === 'ar' ? 'اسم الهدية' : 'Gift Name'}</Label>
              <Input value={giftName} onChange={e => setGiftName(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: وردة 🌹' : 'e.g. Rose 🌹'} className="bg-muted/40" />
            </div>
            {/* هدايا سريعة */}
            <div className="grid grid-cols-4 gap-2">
              {['🌹 وردة', '💎 ماسة', '👑 تاج', '🎂 كيكة', '🏆 كأس', '⭐ نجمة', '🚀 صاروخ', '❤️ قلب'].map(g => (
                <button key={g} onClick={() => setGiftName(g)}
                  className={`p-2 rounded-xl text-xs text-center transition-all ${
                    giftName === g ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
            <Button onClick={sendGift} disabled={loading || !giftName.trim()} className="w-full gradient-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `🎁 ${lang === 'ar' ? 'إرسال' : 'Send'}`}
            </Button>
          </div>
        )}

        {/* ── إرسال إلى السجن ── */}
        {view === 'jail' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === 'ar' ? 'ID غرفة السجن' : 'Jail Room ID'}</Label>
              <Input value={jailRoomId} onChange={e => setJailRoomId(e.target.value)}
                placeholder={lang === 'ar' ? 'أدخل ID الغرفة...' : 'Enter room ID...'} className="bg-muted/40" dir="ltr" />
              <p className="text-xs text-muted-foreground">
                {lang === 'ar' ? 'سيتم حبس المستخدم في هذه الغرفة ولن يستطيع الخروج منها.' : 'The user will be locked in this room and cannot leave.'}
              </p>
            </div>
            <Button onClick={sendToJail} disabled={loading || !jailRoomId.trim()} variant="destructive" className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `⛓️ ${lang === 'ar' ? 'إرسال إلى السجن' : 'Send to Jail'}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── شاشة السجن الرئيسية ────────────────────────────────────────────────────
const JailedScreen: React.FC<JailedScreenProps> = ({ roomName }) => {
  const { lang } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [targetUserId] = useState('');
  const [targetName] = useState('');

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <Lock className="w-12 h-12 text-destructive" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-destructive mb-4">
            {lang === 'ar' ? '⛓️ أنت محبوس ⛓️' : '⛓️ You are Jailed ⛓️'}
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-6">
            {lang === 'ar'
              ? 'تم إرسالك إلى غرفة السجن من قبل الإدارة. لا يمكنك التنقل إلى أي غرفة أخرى حتى يتم فك الحبس.'
              : 'You have been sent to jail by the administration. You cannot navigate to any other room until you are released.'}
          </p>

          {/* Current Room Info */}
          {roomName && (
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">
                {lang === 'ar' ? 'أنت حالياً في:' : 'You are currently in:'}
              </p>
              <p className="text-xl font-bold text-foreground">{roomName}</p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-center justify-center gap-2 text-amber-500 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {lang === 'ar' ? 'تواصل مع الإدارة لفك الحبس' : 'Contact administration to be released'}
            </span>
          </div>
        </div>
      </div>

      {/* قائمة إجراءات المستخدم */}
      {showMenu && targetUserId && (
        <UserActionsMenu
          targetUserId={targetUserId}
          targetName={targetName}
          onClose={() => setShowMenu(false)}
        />
      )}
    </>
  );
};

// ── تصدير مكوّن القائمة منفصلاً للاستخدام في أي مكان ─────────────────────
export { UserActionsMenu };
export default JailedScreen;
