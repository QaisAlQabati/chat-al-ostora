import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Plus, X, Volume2, VolumeX, Hand, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MicSlot, RoomMicSettings } from '@/hooks/useRoomMics';
import useVoiceChat from '@/hooks/useVoiceChat';

interface MicSlotsDisplayProps {
  slots: MicSlot[];
  settings: RoomMicSettings | null;
  maxSlots: number;
  isModOrOwner: boolean;
  mySlot: MicSlot | null;
  hasMyRequest: boolean;
  onRequestMic: (slotNumber?: number) => void;
  onCancelRequest: () => void;
  onLeaveSlot: () => void;
  onRemoveFromMic: (slotId: string) => void;
  onToggleMute: (slotId: string, muted: boolean) => void;
  roomId?: string;
}

const MicSlotsDisplay: React.FC<MicSlotsDisplayProps> = ({
  slots,
  settings,
  maxSlots,
  isModOrOwner,
  mySlot,
  hasMyRequest,
  onRequestMic,
  onCancelRequest,
  onLeaveSlot,
  onRemoveFromMic,
  onToggleMute,
  roomId,
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  // ✅ تفعيل الصوت الحقيقي
  const { isMicActive, micError, mutedPeers, togglePeerMute } = useVoiceChat(
    roomId,
    !!mySlot  // أنا على المايك؟
  );

  if (!settings?.mic_enabled) {
    return null;
  }

  const slotArray = Array.from({ length: maxSlots }, (_, i) => {
    return slots.find(s => s.slot_number === i + 1) || null;
  });

  const handleVolumeChange = (slotId: string, value: number[]) => {
    setVolumes(prev => ({ ...prev, [slotId]: value[0] }));
  };

  return (
    <div className="w-full px-2 py-3">

      {/* ✅ تنبيه خطأ الميكروفون */}
      {micError && (
        <div className="mb-2 mx-2 flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* ✅ مؤشر أن الميكروفون يعمل */}
      {isMicActive && mySlot && (
        <div className="mb-2 mx-2 flex items-center gap-2 p-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-600">
            {lang === 'ar' ? 'الميكروفون يعمل — الجميع يسمعك' : 'Mic active — everyone can hear you'}
          </span>
        </div>
      )}

      {/* Mic Slots Row */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {slotArray.map((slot, index) => {
          const slotNumber   = index + 1;
          const isMySlot     = slot?.user_id === user?.id;
          // ✅ الكتم من عندك أنت فقط (محلي)
          const isLocallyMuted = slot ? mutedPeers.has(slot.user_id) : false;
          const volume       = slot ? (volumes[slot.id] ?? 100) : 100;

          return (
            <div
              key={index}
              className={cn(
                'relative flex flex-col items-center',
                'w-16 transition-all duration-200'
              )}
            >
              {slot ? (
                // Occupied Slot
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex flex-col items-center gap-1 focus:outline-none">
                      {/* Avatar with mic indicator */}
                      <div className="relative">
                        <div className={cn(
                          'w-12 h-12 rounded-full overflow-hidden ring-2',
                          slot.is_muted ? 'ring-red-500' : 'ring-green-500',
                          'bg-gradient-to-br from-primary/20 to-primary/40'
                        )}>
                          {slot.profile?.profile_picture ? (
                            <img
                              src={slot.profile.profile_picture}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-primary">
                              {slot.profile?.display_name?.[0] || '?'}
                            </div>
                          )}
                        </div>

                        {/* Mic status indicator */}
                        <div className={cn(
                          'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
                          slot.is_muted || isLocallyMuted ? 'bg-red-500' : 'bg-green-500'
                        )}>
                          {slot.is_muted || isLocallyMuted ? (
                            <MicOff className="w-3 h-3 text-white" />
                          ) : (
                            <Mic className="w-3 h-3 text-white" />
                          )}
                        </div>

                        {/* Speaking animation — يشتغل لما الصوت فعّال */}
                        {!slot.is_muted && !isLocallyMuted && (
                          <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-30" />
                        )}
                      </div>

                      {/* Name */}
                      <span className="text-[10px] text-center truncate max-w-full font-medium">
                        {slot.profile?.display_name}
                      </span>

                      {/* Slot number */}
                      <span className="text-[8px] text-muted-foreground">
                        {slotNumber}
                      </span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="center" className="w-48">
                    {/* Volume control */}
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2 mb-2">
                        {isLocallyMuted ? (
                          <VolumeX className="w-4 h-4 text-red-500" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                        <Slider
                          value={[isLocallyMuted ? 0 : volume]}
                          max={100}
                          step={1}
                          onValueChange={(v) => handleVolumeChange(slot.id, v)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {/* ✅ كتم محلي — يكتم الصوت من عندك أنت فقط */}
                    {!isMySlot && (
                      <DropdownMenuItem onClick={() => togglePeerMute(slot.user_id)}>
                        {isLocallyMuted ? (
                          <>
                            <Volume2 className="w-4 h-4 mr-2" />
                            {lang === 'ar' ? 'إلغاء الكتم' : 'Unmute'}
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-4 h-4 mr-2" />
                            {lang === 'ar' ? 'كتم لي فقط' : 'Mute for me'}
                          </>
                        )}
                      </DropdownMenuItem>
                    )}

                    {/* Self controls */}
                    {isMySlot && (
                      <DropdownMenuItem onClick={onLeaveSlot} className="text-destructive">
                        <X className="w-4 h-4 mr-2" />
                        {lang === 'ar' ? 'نزول من المايك' : 'Leave Mic'}
                      </DropdownMenuItem>
                    )}

                    {/* Moderator controls */}
                    {isModOrOwner && !isMySlot && (
                      <>
                        <DropdownMenuItem onClick={() => onToggleMute(slot.id, !slot.is_muted)}>
                          {slot.is_muted ? (
                            <>
                              <Mic className="w-4 h-4 mr-2" />
                              {lang === 'ar' ? 'إلغاء كتم المايك' : 'Unmute Mic'}
                            </>
                          ) : (
                            <>
                              <MicOff className="w-4 h-4 mr-2" />
                              {lang === 'ar' ? 'كتم المايك' : 'Mute Mic'}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onRemoveFromMic(slot.id)}
                          className="text-destructive"
                        >
                          <X className="w-4 h-4 mr-2" />
                          {lang === 'ar' ? 'إنزال من المايك' : 'Remove from Mic'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Empty Slot
                <button
                  onClick={() => {
                    if (mySlot) return;
                    if (hasMyRequest) {
                      onCancelRequest();
                    } else {
                      onRequestMic(slotNumber);
                    }
                  }}
                  disabled={!!mySlot}
                  className={cn(
                    'flex flex-col items-center gap-1 focus:outline-none',
                    mySlot && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center',
                    'border-muted-foreground/30 bg-muted/20',
                    'hover:border-primary/50 hover:bg-primary/10 transition-colors',
                    hasMyRequest && 'border-yellow-500 bg-yellow-500/10'
                  )}>
                    {hasMyRequest ? (
                      <Hand className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {hasMyRequest 
                      ? (lang === 'ar' ? 'انتظار' : 'Waiting')
                      : (lang === 'ar' ? 'طلب' : 'Request')
                    }
                  </span>
                  <span className="text-[8px] text-muted-foreground">
                    {slotNumber}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MicSlotsDisplay;
