import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock, AlertTriangle } from 'lucide-react';

interface JailedScreenProps {
  roomName?: string;
}

const JailedScreen: React.FC<JailedScreenProps> = ({ roomName }) => {
  const { lang } = useLanguage();

  return (
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
            : 'You have been sent to jail by the administration. You cannot navigate to any other room until you are released.'
          }
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
            {lang === 'ar' 
              ? 'تواصل مع الإدارة لفك الحبس'
              : 'Contact administration to be released'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default JailedScreen;
