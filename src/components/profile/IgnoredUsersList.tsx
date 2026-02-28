
import React, { useState, useEffect } from 'react';
import { X, Search, EyeOff, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIgnoredUsers } from '@/hooks/useIgnoredUsers';
import { toast } from 'sonner';

interface IgnoredUser {
  user_id: string;
  display_name: string;
  profile_picture: string | null;
}

interface IgnoredUsersListProps {
  isOpen: boolean;
  onClose: () => void;
}

const IgnoredUsersList: React.FC<IgnoredUsersListProps> = ({ isOpen, onClose }) => {
  const { lang } = useLanguage();
  const { getIgnoredUsersWithProfiles, unignoreUser } = useIgnoredUsers();
  const [users, setUsers] = useState<IgnoredUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getIgnoredUsersWithProfiles();
    setUsers(data);
    setLoading(false);
  };

  const handleUnignore = (userId: string) => {
    unignoreUser(userId);
    setUsers(prev => prev.filter(u => u.user_id !== userId));
    toast.success(lang === 'ar' ? 'تم إلغاء التجاهل' : 'User unignored');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EyeOff className="w-5 h-5" />
            {lang === 'ar' ? 'المستخدمين المتجاهلين' : 'Ignored Users'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.profile_picture || undefined} />
                    <AvatarFallback>
                      {user.display_name[0]}
                    </AvatarFallback>
                  </Avatar>

                  <span className="flex-1 font-medium">{user.display_name}</span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnignore(user.user_id)}
                    className="text-primary"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {lang === 'ar' ? 'إلغاء' : 'Remove'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <EyeOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{lang === 'ar' ? 'لا يوجد مستخدمين متجاهلين' : 'No ignored users'}</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default IgnoredUsersList;
