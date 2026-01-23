import React, { useState, useEffect } from 'react';
import { X, Search, Crown, Star, Shield, Volume2, VolumeX, UserX, MoreVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Member {
  id: string;
  user_id: string;
  role: string;
  is_banned: boolean;
  is_muted: boolean;
  profile?: {
    display_name: string;
    username: string;
    profile_picture: string | null;
    is_verified: boolean;
    is_vip: boolean;
    level: number;
  };
}

interface RoomMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  canModerate: boolean;
  isAppOwner: boolean;
}

const RoomMembersModal: React.FC<RoomMembersModalProps> = ({
  isOpen,
  onClose,
  roomId,
  canModerate,
  isAppOwner,
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [bannedMembers, setBannedMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBanned, setShowBanned] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, roomId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_room_members')
        .select('*')
        .eq('room_id', roomId);

      if (error) throw error;

      // Fetch profiles for each member
      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, profile_picture, is_verified, is_vip, level')
            .eq('user_id', member.user_id)
            .single();

          return { ...member, profile };
        })
      );

      setMembers(membersWithProfiles.filter(m => !m.is_banned));
      setBannedMembers(membersWithProfiles.filter(m => m.is_banned));
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMute = async (memberId: string, mute: boolean) => {
    try {
      const { error } = await supabase
        .from('chat_room_members')
        .update({ is_muted: mute })
        .eq('id', memberId);

      if (error) throw error;

      toast.success(mute
        ? (lang === 'ar' ? 'تم كتم العضو' : 'Member muted')
        : (lang === 'ar' ? 'تم إلغاء الكتم' : 'Member unmuted')
      );
      fetchMembers();
    } catch (error) {
      console.error('Error muting member:', error);
      toast.error(lang === 'ar' ? 'فشلت العملية' : 'Operation failed');
    }
  };

  const handleBan = async (memberId: string, ban: boolean, userId: string) => {
    try {
      const { error } = await supabase
        .from('chat_room_members')
        .update({
          is_banned: ban,
          banned_at: ban ? new Date().toISOString() : null,
          banned_by: ban ? user?.id : null,
        })
        .eq('id', memberId);

      if (error) throw error;

      toast.success(ban
        ? (lang === 'ar' ? 'تم حظر العضو' : 'Member banned')
        : (lang === 'ar' ? 'تم إلغاء الحظر' : 'Member unbanned')
      );
      fetchMembers();
    } catch (error) {
      console.error('Error banning member:', error);
      toast.error(lang === 'ar' ? 'فشلت العملية' : 'Operation failed');
    }
  };

  const handleSetModerator = async (memberId: string, isMod: boolean) => {
    if (!isAppOwner) return;

    try {
      const { error } = await supabase
        .from('chat_room_members')
        .update({ role: isMod ? 'moderator' : 'member' })
        .eq('id', memberId);

      if (error) throw error;

      toast.success(isMod
        ? (lang === 'ar' ? 'تم تعيين كإداري' : 'Set as moderator')
        : (lang === 'ar' ? 'تم إزالة صلاحيات الإدارة' : 'Moderator removed')
      );
      fetchMembers();
    } catch (error) {
      console.error('Error setting moderator:', error);
      toast.error(lang === 'ar' ? 'فشلت العملية' : 'Operation failed');
    }
  };

  const filteredMembers = (showBanned ? bannedMembers : members).filter(member =>
    member.profile?.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.profile?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 animate-fade-in">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border glass-dark z-10">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
          <h2 className="text-lg font-semibold">
            {showBanned
              ? (lang === 'ar' ? 'المحظورين' : 'Banned Members')
              : (lang === 'ar' ? 'الأعضاء' : 'Members')}
          </h2>
          <div className="w-10" />
        </div>

        {/* Tabs */}
        {canModerate && (
          <div className="flex gap-2 p-4 border-b border-border">
            <Button
              variant={showBanned ? 'outline' : 'default'}
              size="sm"
              onClick={() => setShowBanned(false)}
            >
              {lang === 'ar' ? 'الأعضاء' : 'Members'} ({members.length})
            </Button>
            <Button
              variant={showBanned ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowBanned(true)}
            >
              {lang === 'ar' ? 'المحظورين' : 'Banned'} ({bannedMembers.length})
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Members List */}
        <ScrollArea className="flex-1 px-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMembers.length > 0 ? (
            <div className="space-y-2 pb-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.profile?.profile_picture || undefined} />
                    <AvatarFallback>
                      {member.profile?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium truncate">
                        {member.profile?.display_name}
                      </span>
                      {member.role === 'owner' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      {member.role === 'moderator' && (
                        <Star className="w-4 h-4 text-blue-500" />
                      )}
                      {member.profile?.is_verified && (
                        <Shield className="w-4 h-4 text-green-500" />
                      )}
                      {member.is_muted && (
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      @{member.profile?.username}
                    </p>
                  </div>

                  {canModerate && member.user_id !== user?.id && member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!showBanned && (
                          <>
                            {member.is_muted ? (
                              <DropdownMenuItem onClick={() => handleMute(member.id, false)}>
                                <Volume2 className="w-4 h-4 mr-2" />
                                {lang === 'ar' ? 'إلغاء الكتم' : 'Unmute'}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleMute(member.id, true)}>
                                <VolumeX className="w-4 h-4 mr-2" />
                                {lang === 'ar' ? 'كتم' : 'Mute'}
                              </DropdownMenuItem>
                            )}

                            {isAppOwner && (
                              <>
                                <DropdownMenuSeparator />
                                {member.role === 'moderator' ? (
                                  <DropdownMenuItem onClick={() => handleSetModerator(member.id, false)}>
                                    <Star className="w-4 h-4 mr-2" />
                                    {lang === 'ar' ? 'إزالة الإدارة' : 'Remove Moderator'}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleSetModerator(member.id, true)}>
                                    <Star className="w-4 h-4 mr-2" />
                                    {lang === 'ar' ? 'تعيين كإداري' : 'Make Moderator'}
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleBan(member.id, true, member.user_id)}
                              className="text-destructive"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              {lang === 'ar' ? 'حظر' : 'Ban'}
                            </DropdownMenuItem>
                          </>
                        )}

                        {showBanned && (
                          <DropdownMenuItem onClick={() => handleBan(member.id, false, member.user_id)}>
                            <Shield className="w-4 h-4 mr-2" />
                            {lang === 'ar' ? 'إلغاء الحظر' : 'Unban'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery
                ? (lang === 'ar' ? 'لا توجد نتائج' : 'No results')
                : showBanned
                  ? (lang === 'ar' ? 'لا يوجد محظورين' : 'No banned members')
                  : (lang === 'ar' ? 'لا يوجد أعضاء' : 'No members')}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default RoomMembersModal;
