import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface MicInvitation {
  id: string;
  room_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  mic_position: number | null;
  inviter?: {
    display_name: string;
    profile_picture: string | null;
  };
}

interface MicInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: MicInvitation | null;
  onAccept: () => void;
  onReject: () => void;
}

const MicInvitationModal: React.FC<MicInvitationModalProps> = ({
  isOpen,
  onClose,
  invitation,
  onAccept,
  onReject,
}) => {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!invitation) return;
    setLoading(true);
    
    try {
      // Update invitation status
      await supabase
        .from('mic_invitations')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invitation.id);
      
      onAccept();
      toast.success(lang === 'ar' ? 'تم قبول الدعوة!' : 'Invitation accepted!');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(lang === 'ar' ? 'فشل قبول الدعوة' : 'Failed to accept invitation');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleReject = async () => {
    if (!invitation) return;
    setLoading(true);
    
    try {
      await supabase
        .from('mic_invitations')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', invitation.id);
      
      onReject();
      toast.info(lang === 'ar' ? 'تم رفض الدعوة' : 'Invitation rejected');
    } catch (error) {
      console.error('Error rejecting invitation:', error);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            {lang === 'ar' ? 'دعوة للانضمام للمايك' : 'Mic Invitation'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary animate-pulse">
            {invitation?.inviter?.profile_picture ? (
              <img
                src={invitation.inviter.profile_picture}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500 text-white text-2xl font-bold">
                {invitation?.inviter?.display_name?.[0] || '?'}
              </div>
            )}
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            <span className="font-bold text-foreground">
              {invitation?.inviter?.display_name}
            </span>
            {' '}
            {lang === 'ar' ? 'يدعوك للانضمام إلى المايك' : 'invites you to join the mic'}
          </p>
          
          <div className="flex items-center gap-4 mt-4">
            <div className="flex flex-col items-center">
              <Mic className="w-6 h-6 text-primary" />
              <span className="text-xs text-muted-foreground mt-1">
                {lang === 'ar' ? 'المايك' : 'Mic'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <Video className="w-6 h-6 text-primary" />
              <span className="text-xs text-muted-foreground mt-1">
                {lang === 'ar' ? 'الكاميرا' : 'Camera'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={loading}
            className="flex-1 gap-2"
          >
            <X className="w-4 h-4" />
            {lang === 'ar' ? 'رفض' : 'Decline'}
          </Button>
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-purple-500"
          >
            <Check className="w-4 h-4" />
            {lang === 'ar' ? 'قبول' : 'Accept'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MicInvitationModal;
