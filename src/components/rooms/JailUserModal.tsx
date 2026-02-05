import React, { useState, useEffect } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Room {
  id: string;
  name: string;
  icon: string;
  is_jail: boolean;
}

interface JailUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
}

const JailUserModal: React.FC<JailUserModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [jailing, setJailing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('id, name, icon, is_jail')
        .eq('is_active', true)
        .order('is_jail', { ascending: false })
        .order('name');

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJailUser = async (roomId: string, roomName: string) => {
    setJailing(true);
    try {
      // Update the user's profile to mark them as jailed
      const { error } = await supabase
        .from('profiles')
        .update({ jailed_in_room: roomId })
        .eq('user_id', targetUserId);

      if (error) throw error;

      // Remove user from all rooms and add them to the jail room
      // First, delete existing memberships
      await supabase
        .from('chat_room_members')
        .delete()
        .eq('user_id', targetUserId);

      // Add to jail room
      await supabase
        .from('chat_room_members')
        .insert({
          room_id: roomId,
          user_id: targetUserId,
          role: 'member',
        });

      toast.success(
        lang === 'ar' 
          ? `تم إرسال ${targetUserName} إلى ${roomName}` 
          : `${targetUserName} has been sent to ${roomName}`
      );
      onClose();
    } catch (error) {
      console.error('Error jailing user:', error);
      toast.error(lang === 'ar' ? 'فشل إرسال المستخدم للسجن' : 'Failed to jail user');
    } finally {
      setJailing(false);
    }
  };

  const handleReleaseUser = async () => {
    setJailing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ jailed_in_room: null })
        .eq('user_id', targetUserId);

      if (error) throw error;

      toast.success(
        lang === 'ar' 
          ? `تم فك الحبس عن ${targetUserName}` 
          : `${targetUserName} has been released`
      );
      onClose();
    } catch (error) {
      console.error('Error releasing user:', error);
      toast.error(lang === 'ar' ? 'فشل فك الحبس' : 'Failed to release user');
    } finally {
      setJailing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-destructive" />
            {lang === 'ar' ? 'إرسال إلى السجن' : 'Send to Jail'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {lang === 'ar' 
              ? `اختر الغرفة التي سيتم حبس "${targetUserName}" فيها:`
              : `Select the room where "${targetUserName}" will be jailed:`
            }
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleJailUser(room.id, room.name)}
                  disabled={jailing}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-muted/50 ${
                    room.is_jail ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/30'
                  }`}
                >
                  <span className="text-2xl">{room.icon}</span>
                  <div className="flex-1 text-right">
                    <p className="font-medium">{room.name}</p>
                    {room.is_jail && (
                      <p className="text-xs text-destructive">
                        {lang === 'ar' ? 'غرفة سجن رسمية' : 'Official Jail Room'}
                      </p>
                    )}
                  </div>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Release Button */}
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={handleReleaseUser}
            disabled={jailing}
          >
            {jailing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {lang === 'ar' ? 'فك الحبس' : 'Release from Jail'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JailUserModal;
