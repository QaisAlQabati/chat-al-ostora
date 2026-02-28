// useXBanCheck.ts
// يتحقق من الـ X-Ban عند تحميل التطبيق حتى لو مسح الشخص بياناته

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

interface XBanStatus {
  isXBanned: boolean;
  reason?: string;
  bannedBy?: string;
  loading: boolean;
}

export const useXBanCheck = (): XBanStatus => {
  const [status, setStatus] = useState<XBanStatus>({ isXBanned: false, loading: true });

  useEffect(() => {
    const checkXBan = async () => {
      try {
        // الحصول على بصمة الجهاز
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const fingerprint = result.visitorId;

        // الحصول على IP عبر Supabase Edge Function
        const { data: ipData } = await supabase.functions.invoke('get-client-ip');
        const ip = ipData?.ip;

        // البحث في جدول X-Ban
        let query = supabase
          .from('xban_fingerprints')
          .select(`
            *,
            banned_by_profile:profiles!xban_fingerprints_banned_by_fkey(username)
          `)
          .or(`device_fingerprint.eq.${fingerprint},ip_address.eq.${ip}`)
          .limit(1)
          .maybeSingle();

        const { data: xban } = await query;

        if (xban) {
          setStatus({
            isXBanned: true,
            reason: xban.reason,
            bannedBy: xban.banned_by_profile?.username,
            loading: false,
          });
        } else {
          setStatus({ isXBanned: false, loading: false });
        }
      } catch (err) {
        setStatus({ isXBanned: false, loading: false });
      }
    };

    checkXBan();
  }, []);

  return status;
};

// ============================================================
// كيفية الاستخدام في App.tsx أو الـ layout الرئيسي:
// ============================================================
/*
import { useXBanCheck } from '@/hooks/useXBanCheck';
import BannedScreen from '@/components/BannedScreen';

function App() {
  const xbanStatus = useXBanCheck();

  if (xbanStatus.loading) return <LoadingSpinner />;

  if (xbanStatus.isXBanned) {
    return (
      <BannedScreen
        isXBan={true}
        banReason={xbanStatus.reason}
        bannedBy={xbanStatus.bannedBy}
      />
    );
  }

  return <YourApp />;
}
*/
