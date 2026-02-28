// BanInfo.tsx - يُستخدم في صفحة ملف المستخدم لعرض معلومات الحظر
import React, { useEffect, useState } from 'react';
import { Ban, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface BanInfoProps {
  userId: string;
}

const BanInfo: React.FC<BanInfoProps> = ({ userId }) => {
  const { lang } = useLanguage();
  const [banLog, setBanLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanLog = async () => {
      const { data } = await supabase
        .from('ban_logs')
        .select(`
          *,
          banned_by_profile:profiles!ban_logs_banned_by_user_id_fkey(username, avatar_url)
        `)
        .eq('banned_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setBanLog(data);
      setLoading(false);
    };

    fetchBanLog();
  }, [userId]);

  if (loading || !banLog) return null;

  const isXBan = banLog.is_xban;
  const bannedByUsername = banLog.banned_by_profile?.username || 'Admin';

  return (
    <div className={`rounded-xl p-4 border space-y-3 ${isXBan ? 'bg-purple-500/10 border-purple-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
      <div className="flex items-center gap-2">
        {isXBan ? (
          <Shield className="w-5 h-5 text-purple-500" />
        ) : (
          <Ban className="w-5 h-5 text-destructive" />
        )}
        <span className={`font-bold ${isXBan ? 'text-purple-400' : 'text-destructive'}`}>
          {isXBan
            ? (lang === 'ar' ? 'محظور بـ X-Ban' : 'X-Banned')
            : (lang === 'ar' ? 'محظور' : 'Banned')}
        </span>
      </div>

      <div className="text-sm space-y-2">
        <div>
          <span className="text-muted-foreground">{lang === 'ar' ? 'السبب: ' : 'Reason: '}</span>
          <span className="font-medium">{banLog.reason}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{lang === 'ar' ? 'حُظر بواسطة: ' : 'Banned by: '}</span>
          <span className="font-medium">@{bannedByUsername}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{lang === 'ar' ? 'تاريخ الحظر: ' : 'Banned at: '}</span>
          <span className="font-medium">
            {new Date(banLog.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </span>
        </div>
        {!isXBan && (
          <div>
            <span className="text-muted-foreground">{lang === 'ar' ? 'ينتهي: ' : 'Expires: '}</span>
            <span className="font-medium">
              {banLog.expires_at
                ? new Date(banLog.expires_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : (lang === 'ar' ? 'دائم' : 'Permanent')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BanInfo;
