import React from 'react';
import { Ban, LogOut } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface BannedScreenProps {
  banReason?: string;
  banExpiresAt?: string;
}

const BannedScreen: React.FC<BannedScreenProps> = ({ banReason, banExpiresAt }) => {
  const { lang } = useLanguage();
  const { signOut } = useAuth();

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
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ban Icon */}
        <div className="w-24 h-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
          <Ban className="w-12 h-12 text-destructive" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-destructive">
          {lang === 'ar' ? '⛔ أنت محظور' : '⛔ You Are Banned'}
        </h1>

        {/* Reason Card */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {lang === 'ar' ? 'السبب:' : 'Reason:'}
            </p>
            <p className="font-medium text-lg">
              {banReason || (lang === 'ar' ? 'مخالفة قوانين الموقع' : 'Violation of site rules')}
            </p>
          </div>

          <div className="border-t border-destructive/20 pt-4">
            <p className="text-sm text-muted-foreground mb-1">
              {lang === 'ar' ? 'ينتهي الحظر في:' : 'Ban expires:'}
            </p>
            <p className="font-medium">
              {formatExpiryDate(banExpiresAt)}
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-muted-foreground">
          {lang === 'ar' 
            ? 'لا يمكنك الوصول إلى الموقع أثناء فترة الحظر. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الإدارة.'
            : 'You cannot access the site during your ban period. If you believe this is a mistake, please contact the administration.'}
        </p>

        {/* Logout Button */}
        <Button 
          variant="outline" 
          onClick={signOut}
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
        </Button>
      </div>
    </div>
  );
};

export default BannedScreen;
