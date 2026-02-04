import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Lock, Users, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Room {
  id: string;
  name: string;
  icon: string;
  background_url: string | null;
  is_password_protected: boolean;
  is_pinned: boolean;
  member_count: number;
}

interface RoomSwitcherProps {
  currentRoomId?: string;
  children: React.ReactNode;
}

const RoomSwitcher: React.FC<RoomSwitcherProps> = ({ currentRoomId, children }) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRooms();
    }
  }, [open]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('id, name, icon, background_url, is_password_protected, is_pinned')
        .eq('is_active', true);

      if (error) throw error;

      // Get member counts
      const roomsWithCounts = await Promise.all(
        (data || []).map(async (room) => {
          const { count } = await supabase
            .from('chat_room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('is_banned', false);

          return { ...room, member_count: count || 0 };
        })
      );

      // Sort: pinned first, then by member count
      roomsWithCounts.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return b.member_count - a.member_count;
      });

      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleRoomClick = (roomId: string) => {
    setOpen(false);
    if (roomId !== currentRoomId) {
      navigate(`/rooms/${roomId}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            {lang === 'ar' ? 'الغرف' : 'Rooms'}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-2 space-y-1">
            {rooms.map((room) => (
              <Button
                key={room.id}
                variant={room.id === currentRoomId ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-auto py-3",
                  room.id === currentRoomId && "bg-primary/10"
                )}
                onClick={() => handleRoomClick(room.id)}
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                  {room.background_url ? (
                    <img src={room.background_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    room.icon
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-1">
                    {room.is_pinned && <Pin className="w-3 h-3 text-primary" />}
                    <span className="font-medium truncate">{room.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{room.member_count}</span>
                    {room.is_password_protected && <Lock className="w-3 h-3" />}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default RoomSwitcher;
