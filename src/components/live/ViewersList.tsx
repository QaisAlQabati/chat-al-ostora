import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { 
  Users, Mic, Crown, Shield, Ban, 
  UserPlus, MoreVertical, Search 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Viewer {
  id: string;
  user_id: string;
  is_on_mic: boolean;
  is_moderator: boolean;
  profile?: {
    display_name: string;
    profile_picture: string | null;
    level: number;
    is_vip?: boolean;
    is_verified?: boolean;
  };
}

interface ViewersListProps {
  viewers: Viewer[];
  isOwner: boolean;
  currentUserId?: string;
  onInviteToMic: (userId: string) => void;
  onMakeModerator: (userId: string) => void;
  onKickUser: (userId: string) => void;
  onMuteUser: (userId: string) => void;
}

const ViewersList: React.FC<ViewersListProps> = ({
  viewers,
  isOwner,
  currentUserId,
  onInviteToMic,
  onMakeModerator,
  onKickUser,
  onMuteUser,
}) => {
  const { lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredViewers = viewers.filter((viewer) =>
    viewer.profile?.display_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const moderators = filteredViewers.filter((v) => v.is_moderator);
  const onMicViewers = filteredViewers.filter((v) => v.is_on_mic && !v.is_moderator);
  const regularViewers = filteredViewers.filter((v) => !v.is_on_mic && !v.is_moderator);

  const ViewerItem = ({ viewer }: { viewer: Viewer }) => (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {viewer.profile?.profile_picture ? (
              <img
                src={viewer.profile.profile_picture}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {viewer.profile?.display_name?.[0] || '?'}
              </div>
            )}
          </div>
          {viewer.is_on_mic && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <Mic className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm">{viewer.profile?.display_name}</span>
            {viewer.is_moderator && (
              <Shield className="w-3.5 h-3.5 text-blue-500" />
            )}
            {viewer.profile?.is_vip && (
              <Crown className="w-3.5 h-3.5 text-yellow-500" />
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Lv.{viewer.profile?.level}
          </span>
        </div>
      </div>

      {isOwner && viewer.user_id !== currentUserId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!viewer.is_on_mic && (
              <DropdownMenuItem onClick={() => onInviteToMic(viewer.user_id)}>
                <Mic className="w-4 h-4 mr-2" />
                {lang === 'ar' ? 'دعوة للمايك' : 'Invite to Mic'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onMakeModerator(viewer.user_id)}>
              <Shield className="w-4 h-4 mr-2" />
              {viewer.is_moderator
                ? (lang === 'ar' ? 'إزالة الإشراف' : 'Remove Moderator')
                : (lang === 'ar' ? 'تعيين مشرف' : 'Make Moderator')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMuteUser(viewer.user_id)}>
              <Mic className="w-4 h-4 mr-2" />
              {lang === 'ar' ? 'كتم' : 'Mute'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onKickUser(viewer.user_id)}
              className="text-destructive"
            >
              <Ban className="w-4 h-4 mr-2" />
              {lang === 'ar' ? 'طرد' : 'Kick'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 bg-black/50 text-white">
          <Users className="w-4 h-4" />
          <span>{viewers.length}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {lang === 'ar' ? 'المشاهدون' : 'Viewers'}
            <span className="text-muted-foreground">({viewers.length})</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4">
              {/* Moderators */}
              {moderators.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {lang === 'ar' ? 'المشرفون' : 'Moderators'}
                  </h4>
                  {moderators.map((viewer) => (
                    <ViewerItem key={viewer.id} viewer={viewer} />
                  ))}
                </div>
              )}

              {/* On Mic */}
              {onMicViewers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Mic className="w-3 h-3" />
                    {lang === 'ar' ? 'على المايك' : 'On Mic'}
                  </h4>
                  {onMicViewers.map((viewer) => (
                    <ViewerItem key={viewer.id} viewer={viewer} />
                  ))}
                </div>
              )}

              {/* Regular Viewers */}
              {regularViewers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {lang === 'ar' ? 'المشاهدون' : 'Viewers'}
                  </h4>
                  {regularViewers.map((viewer) => (
                    <ViewerItem key={viewer.id} viewer={viewer} />
                  ))}
                </div>
              )}

              {filteredViewers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {lang === 'ar' ? 'لا يوجد مشاهدون' : 'No viewers found'}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ViewersList;
