import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MessageCircle, BadgeCheck, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string;
  last_message_preview: string | null;
  other_user: {
    user_id: string;
    username: string;
    display_name: string;
    profile_picture: string | null;
    is_verified: boolean;
    is_vip: boolean;
    status: string;
  };
  unread_count: number;
}

const Messages: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      subscribeToMessages();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch other user's profile for each conversation
      const conversationsWithProfiles = await Promise.all(
        (data || []).map(async (conv) => {
          const otherUserId = conv.participant_one === user.id 
            ? conv.participant_two 
            : conv.participant_one;

          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, profile_picture, is_verified, is_vip, status')
            .eq('user_id', otherUserId)
            .maybeSingle();

          // Count unread messages
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            other_user: profileData,
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithProfiles.filter(c => c.other_user));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || loadingConversations) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Conversations List */}
        <div className="space-y-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <Card
                key={conv.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/messages/${conv.other_user.user_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-muted">
                        {conv.other_user.profile_picture ? (
                          <img
                            src={conv.other_user.profile_picture}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl font-bold">
                            {conv.other_user.display_name[0]}
                          </div>
                        )}
                      </div>
                      {/* Status */}
                      <div className={cn(
                        "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card",
                        conv.other_user.status === 'online' ? 'bg-status-online' :
                        conv.other_user.status === 'in_live' ? 'bg-status-live' :
                        'bg-status-offline'
                      )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {conv.other_user.display_name}
                        </p>
                        {conv.other_user.is_verified && (
                          <BadgeCheck className="w-4 h-4 text-diamond flex-shrink-0" />
                        )}
                        {conv.other_user.is_vip && (
                          <Crown className="w-4 h-4 text-gold flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message_preview || (lang === 'ar' ? 'ابدأ المحادثة' : 'Start conversation')}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.last_message_at), {
                          addSuffix: true,
                          locale: lang === 'ar' ? ar : enUS,
                        })}
                      </span>
                      {conv.unread_count > 0 && (
                        <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                          <span className="text-xs text-white font-bold">
                            {conv.unread_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  {searchQuery
                    ? t('noResults')
                    : lang === 'ar' ? 'لا توجد محادثات بعد' : 'No conversations yet'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
