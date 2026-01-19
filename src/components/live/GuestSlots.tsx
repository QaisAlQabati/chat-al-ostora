import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff, Crown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Guest {
  id: string;
  user_id: string;
  mic_position: number;
  is_on_mic: boolean;
  mic_enabled: boolean;
  camera_enabled: boolean;
  is_muted_by_owner: boolean;
  profile?: {
    display_name: string;
    profile_picture: string | null;
    level: number;
  };
  stream?: MediaStream | null;
}

interface GuestSlotsProps {
  guests: Guest[];
  maxSlots: number;
  isOwner: boolean;
  currentUserId?: string;
  onInviteGuest: (position: number) => void;
  onRemoveGuest: (userId: string) => void;
  onToggleGuestMic: (userId: string) => void;
  onToggleGuestCamera: (userId: string) => void;
  layout?: 'horizontal' | 'grid' | 'pk';
}

const GuestSlots: React.FC<GuestSlotsProps> = ({
  guests,
  maxSlots,
  isOwner,
  currentUserId,
  onInviteGuest,
  onRemoveGuest,
  onToggleGuestMic,
  onToggleGuestCamera,
  layout = 'horizontal',
}) => {
  const { lang } = useLanguage();
  
  const slots = Array.from({ length: maxSlots }, (_, i) => {
    return guests.find(g => g.mic_position === i + 1) || null;
  });

  const getLayoutClasses = () => {
    switch (layout) {
      case 'grid':
        return 'grid grid-cols-2 gap-3';
      case 'pk':
        return 'grid grid-cols-2 gap-4';
      default:
        return 'flex gap-3 overflow-x-auto pb-2';
    }
  };

  const getSlotSize = () => {
    switch (layout) {
      case 'pk':
        return 'w-full aspect-video';
      case 'grid':
        return 'aspect-square';
      default:
        return 'w-24 h-28 shrink-0';
    }
  };

  return (
    <div className={cn('w-full', getLayoutClasses())}>
      {slots.map((guest, index) => (
        <div
          key={index}
          className={cn(
            'relative rounded-2xl overflow-hidden',
            getSlotSize(),
            guest
              ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 ring-2 ring-pink-500/50'
              : 'bg-black/40 border-2 border-dashed border-white/20'
          )}
        >
          {guest ? (
            <>
              {/* Guest Video/Avatar */}
              {guest.camera_enabled && guest.stream ? (
                <video
                  autoPlay
                  muted={guest.user_id === currentUserId}
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  ref={(video) => {
                    if (video && guest.stream) {
                      video.srcObject = guest.stream;
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  {guest.profile?.profile_picture ? (
                    <img
                      src={guest.profile.profile_picture}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-white/50"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                      {guest.profile?.display_name?.[0] || '?'}
                    </div>
                  )}
                </div>
              )}

              {/* Guest Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-white text-xs font-medium truncate max-w-[60px]">
                      {guest.profile?.display_name}
                    </span>
                    <span className="px-1 py-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded text-[8px] text-white font-bold">
                      {guest.profile?.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {guest.is_muted_by_owner || !guest.mic_enabled ? (
                      <MicOff className="w-3 h-3 text-red-400" />
                    ) : (
                      <Mic className="w-3 h-3 text-green-400" />
                    )}
                    {guest.camera_enabled ? (
                      <Video className="w-3 h-3 text-green-400" />
                    ) : (
                      <VideoOff className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Owner Controls */}
              {isOwner && guest.user_id !== currentUserId && (
                <div className="absolute top-1 right-1 flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 bg-black/50 hover:bg-black/70"
                    onClick={() => onToggleGuestMic(guest.user_id)}
                  >
                    {guest.is_muted_by_owner ? (
                      <MicOff className="w-3 h-3 text-red-400" />
                    ) : (
                      <Mic className="w-3 h-3 text-white" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 bg-black/50 hover:bg-red-500/70"
                    onClick={() => onRemoveGuest(guest.user_id)}
                  >
                    <X className="w-3 h-3 text-white" />
                  </Button>
                </div>
              )}

              {/* Self Controls */}
              {guest.user_id === currentUserId && (
                <div className="absolute top-1 left-1 flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 bg-black/50 hover:bg-black/70"
                    onClick={() => onToggleGuestMic(guest.user_id)}
                  >
                    {guest.mic_enabled ? (
                      <Mic className="w-3 h-3 text-green-400" />
                    ) : (
                      <MicOff className="w-3 h-3 text-red-400" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 bg-black/50 hover:bg-black/70"
                    onClick={() => onToggleGuestCamera(guest.user_id)}
                  >
                    {guest.camera_enabled ? (
                      <Video className="w-3 h-3 text-green-400" />
                    ) : (
                      <VideoOff className="w-3 h-3 text-red-400" />
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            // Empty Slot
            <button
              onClick={() => isOwner && onInviteGuest(index + 1)}
              className="absolute inset-0 flex flex-col items-center justify-center text-white/50 hover:text-white/80 transition-colors"
              disabled={!isOwner}
            >
              <Plus className="w-8 h-8" />
              <span className="text-xs mt-1">
                {lang === 'ar' ? `مايك ${index + 1}` : `Mic ${index + 1}`}
              </span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default GuestSlots;
