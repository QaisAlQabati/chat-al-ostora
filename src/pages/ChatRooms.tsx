import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, Search, Users, Lock, MessageSquare, 
  Pin, ChevronLeft 
} from 'lucide-react';
import { toast } from 'sonner';
import CreateRoomModal from '@/components/rooms/CreateRoomModal';
import RoomPasswordModal from '@/components/rooms/RoomPasswordModal';

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  background_url: string | null;
  background_color: string;
  is_password_protected: boolean;
  is_pinned: boolean;
  max_members: number;
  created_by: string;
  created_at: string;
  member_count?: number;
}

const ChatRooms: React.FC = () => {
  const { lang } = useLanguage();
  const { user, isOwner } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchRooms();
    
    // Subscribe to room and member changes for real-time updates
    const roomChannel = supabase
      .channel('chat_rooms_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => {
        fetchRooms();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_members' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [user]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Get member counts for each room
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

      // Sort: pinned first, then by member count (descending)
      roomsWithCounts.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return (b.member_count || 0) - (a.member_count || 0);
      });

      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (room: ChatRoom) => {
    if (!user) return;

    try {
      // Check if user is banned from this room
      const { data: membership } = await supabase
        .from('chat_room_members')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership?.is_banned) {
        toast.error(lang === 'ar' ? 'أنت محظور من هذه الغرفة' : 'You are banned from this room');
        return;
      }

      // If password protected and not a member, show password modal
      if (room.is_password_protected && !membership) {
        setSelectedRoom(room);
        setShowPasswordModal(true);
        return;
      }

      // If already a member, just navigate
      if (membership) {
        navigate(`/rooms/${room.id}`);
        return;
      }

      // Join the room
      const { error } = await supabase
        .from('chat_room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;

      navigate(`/rooms/${room.id}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error(lang === 'ar' ? 'فشل الانضمام للغرفة' : 'Failed to join room');
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedRoom || !user) return;

    try {
      // Simple password check (in production, use proper hashing)
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('password_hash')
        .eq('id', selectedRoom.id)
        .single();

      if (room?.password_hash !== password) {
        toast.error(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password');
        return;
      }

      // Join the room
      const { error } = await supabase
        .from('chat_room_members')
        .insert({
          room_id: selectedRoom.id,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;

      setShowPasswordModal(false);
      navigate(`/rooms/${selectedRoom.id}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error(lang === 'ar' ? 'فشل الانضمام للغرفة' : 'Failed to join room');
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold flex-1">
            {lang === 'ar' ? 'غرف الدردشة' : 'Chat Rooms'}
          </h1>
          {isOwner && (
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? 'إنشاء غرفة' : 'Create Room'}
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={lang === 'ar' ? 'البحث عن غرفة...' : 'Search rooms...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Rooms List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRooms.length > 0 ? (
          <div className="space-y-3">
            {filteredRooms.map((room) => (
              <Card 
                key={room.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
                onClick={() => handleJoinRoom(room)}
              >
                <div 
                  className="h-16 relative"
                  style={{ 
                    backgroundColor: room.background_color,
                    backgroundImage: room.background_url ? `url(${room.background_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  {room.is_pinned && (
                    <div className="absolute top-2 right-2 bg-primary/80 rounded-full p-1">
                      <Pin className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 -mt-8 relative z-10">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl overflow-hidden">
                      {room.background_url ? (
                        <img src={room.background_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        room.icon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{room.name}</h3>
                        {room.is_password_protected && (
                          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      {room.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {room.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span className="font-bold text-primary">{room.member_count}</span>/{room.max_members}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {lang === 'ar' ? 'دخول' : 'Join'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {searchQuery
                ? (lang === 'ar' ? 'لا توجد نتائج' : 'No results found')
                : (lang === 'ar' ? 'لا توجد غرف بعد' : 'No rooms yet')}
            </p>
            {isOwner && !searchQuery && (
              <Button onClick={() => setShowCreateModal(true)} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                {lang === 'ar' ? 'إنشاء أول غرفة' : 'Create First Room'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchRooms}
      />

      {/* Password Modal */}
      <RoomPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handlePasswordSubmit}
        roomName={selectedRoom?.name || ''}
      />
    </MainLayout>
  );
};

export default ChatRooms;
