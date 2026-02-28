import React from 'react';
import { Ban, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BannedScreenProps {
  banReason?: string;
  banExpiresAt?: string;
  isXBan?: boolean;
  bannedBy?: string;
}

const BannedScreen: React.FC<BannedScreenProps> = ({ banReason, banExpiresAt, isXBan, bannedBy }) => {
  const { lang } = useLanguage();

  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return lang === 'ar' ? 'دائم' : 'Permanent';
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4" style={{ pointerEvents: 'all' }}>
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ban Icon */}
        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${isXBan ? 'bg-purple-500/20' : 'bg-destructive/20'}`}>
          {isXBan ? (
            <Shield className="w-12 h-12 text-purple-500" />
          ) : (
            <Ban className="w-12 h-12 text-destructive" />
          )}
        </div>

        {/* Title */}
        <h1 className={`text-3xl font-bold ${isXBan ? 'text-purple-500' : 'text-destructive'}`}>
          {isXBan
            ? (lang === 'ar' ? '🚫 أنت محظور نهائياً (X-Ban)' : '🚫 You Are Permanently X-Banned')
            : (lang === 'ar' ? '⛔ أنت محظور' : '⛔ You Are Banned')}
        </h1>

        {isXBan && (
          <p className="text-purple-400 text-sm font-semibold">
            {lang === 'ar'
              ? '⚠️ هذا الحظر مرتبط بجهازك وشبكتك - لا يمكن تجاوزه'
              : '⚠️ This ban is tied to your device & network - it cannot be bypassed'}
          </p>
        )}

        {/* Reason Card */}
        <div className={`border rounded-xl p-6 space-y-4 ${isXBan ? 'bg-purple-500/10 border-purple-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {lang === 'ar' ? 'السبب:' : 'Reason:'}
            </p>
            <p className="font-medium text-lg">
              {banReason || (lang === 'ar' ? 'مخالفة قوانين الموقع' : 'Violation of site rules')}
            </p>
          </div>

          {bannedBy && (
            <div className={`border-t pt-4 ${isXBan ? 'border-purple-500/20' : 'border-destructive/20'}`}>
              <p className="text-sm text-muted-foreground mb-1">
                {lang === 'ar' ? 'تم الحظر بواسطة:' : 'Banned by:'}
              </p>
              <p className="font-medium">{bannedBy}</p>
            </div>
          )}

          <div className={`border-t pt-4 ${isXBan ? 'border-purple-500/20' : 'border-destructive/20'}`}>
            <p className="text-sm text-muted-foreground mb-1">
              {lang === 'ar' ? 'ينتهي الحظر في:' : 'Ban expires:'}
            </p>
            <p className="font-medium">
              {isXBan ? (lang === 'ar' ? 'أبدي ❌' : 'Never ❌') : formatExpiryDate(banExpiresAt)}
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-muted-foreground">
          {isXBan
            ? (lang === 'ar'
              ? 'تم حظرك بشكل نهائي من المنصة. هذا الحظر لا يمكن تجاوزه بأي طريقة.'
              : 'You have been permanently banned from this platform. This ban cannot be bypassed by any means.')
            : (lang === 'ar'
              ? 'لا يمكنك الوصول إلى الموقع أثناء فترة الحظر. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الإدارة.'
              : 'You cannot access the site during your ban period. If you believe this is a mistake, please contact the administration.')}
        </p>

        {/* NO LOGOUT BUTTON - intentionally removed */}
      </div>
    </div>
  );
};

export default BannedScreen;
