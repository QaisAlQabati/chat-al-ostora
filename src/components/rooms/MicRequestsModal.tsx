import React from 'react';
import { X, Check, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { MicRequest, MicSlot } from '@/hooks/useRoomMics';

interface MicRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: MicRequest[];
  slots: MicSlot[];
  maxSlots: number;
  onApprove: (requestId: string, slotNumber: number) => void;
  onReject: (requestId: string) => void;
}

const MicRequestsModal: React.FC<MicRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  slots,
  maxSlots,
  onApprove,
  onReject,
}) => {
  const { lang } = useLanguage();

  if (!isOpen) return null;

  const getAvailableSlots = () => {
    const occupiedSlots = new Set(slots.map(s => s.slot_number));
    const available = [];
    for (let i = 1; i <= maxSlots; i++) {
      if (!occupiedSlots.has(i)) {
        available.push(i);
      }
    }
    return available;
  };

  const availableSlots = getAvailableSlots();

  return (
    <div className="fixed inset-0 z-50 bg-background/95 animate-fade-in">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border glass-dark">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
          <h2 className="text-lg font-semibold">
            {lang === 'ar' ? 'طلبات المايك' : 'Mic Requests'}
            <span className="ml-2 px-2 py-0.5 bg-primary rounded-full text-xs">
              {requests.length}
            </span>
          </h2>
          <div className="w-10" />
        </div>

        <ScrollArea className="flex-1 p-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{lang === 'ar' ? 'لا توجد طلبات' : 'No pending requests'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="glass-card rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
                      {request.profile?.profile_picture ? (
                        <img
                          src={request.profile.profile_picture}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                          {request.profile?.display_name?.[0] || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <p className="font-medium">{request.profile?.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                          locale: lang === 'ar' ? ar : enUS,
                        })}
                      </p>
                    </div>

                    {/* Reject */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onReject(request.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Slot Selection */}
                  {availableSlots.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground self-center">
                        {lang === 'ar' ? 'إصعاد إلى:' : 'Assign to:'}
                      </span>
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant="outline"
                          size="sm"
                          onClick={() => onApprove(request.id, slot)}
                          className="min-w-10"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          {slot}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {lang === 'ar' ? 'جميع المايكات مشغولة' : 'All mics are occupied'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default MicRequestsModal;
