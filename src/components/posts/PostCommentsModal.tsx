import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  MessageCircle, Send, Trash2, Loader2, Lock, Verified, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    display_name: string;
    username: string;
    profile_picture: string | null;
    is_verified: boolean;
    is_vip: boolean;
  };
}

interface Post {
  id: string;
  user_id: string;
  allow_comments: boolean;
}

interface PostCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onUpdate: () => void;
}

const PostCommentsModal: React.FC<PostCommentsModalProps> = ({ 
  isOpen, 
  onClose, 
  post, 
  onUpdate 
}) => {
  const { lang } = useLanguage();
  const { user, isOwner } = useAuth();
  const navigate = useNavigate();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const isMyPost = user?.id === post.user_id;

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, post.id]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', post.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, username, profile_picture, is_verified, is_vip')
            .eq('user_id', comment.user_id)
            .single();
          return { ...comment, profile: profileData };
        })
      );

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendComment = async () => {
    if (!user || !newComment.trim()) return;
    
    if (!post.allow_comments && !isMyPost) {
      toast.error(lang === 'ar' ? 'التعليقات مغلقة' : 'Comments are locked');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
      onUpdate();
    } catch (error) {
      console.error('Error sending comment:', error);
      toast.error(lang === 'ar' ? 'فشل إرسال التعليق' : 'Failed to send comment');
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ is_deleted: true })
        .eq('id', commentId);

      if (error) throw error;

      fetchComments();
      onUpdate();
      toast.success(lang === 'ar' ? 'تم حذف التعليق' : 'Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: lang === 'ar' ? ar : enUS,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            {lang === 'ar' ? 'التعليقات' : 'Comments'}
            <span className="text-muted-foreground text-sm">
              ({comments.length})
            </span>
            {!post.allow_comments && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                {lang === 'ar' ? 'مغلقة' : 'Locked'}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(80vh-140px)] mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{lang === 'ar' ? 'لا توجد تعليقات بعد' : 'No comments yet'}</p>
            </div>
          ) : (
            <div className="space-y-4 pr-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 group">
                  <Avatar 
                    className="w-8 h-8 cursor-pointer flex-shrink-0"
                    onClick={() => navigate(`/profile/${comment.user_id}`)}
                  >
                    <AvatarImage src={comment.profile?.profile_picture || ''} />
                    <AvatarFallback className="text-xs">
                      {comment.profile?.display_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1 mb-1">
                        <span 
                          className="font-medium text-sm cursor-pointer hover:underline"
                          onClick={() => navigate(`/profile/${comment.user_id}`)}
                        >
                          {comment.profile?.display_name}
                        </span>
                        {comment.profile?.is_verified && (
                          <Verified className="w-3 h-3 text-primary" />
                        )}
                        {comment.profile?.is_vip && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(comment.created_at)}
                    </p>
                  </div>

                  {(comment.user_id === user?.id || isMyPost || isOwner) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteComment(comment.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        {(post.allow_comments || isMyPost) && (
          <div className="flex gap-2 pt-4 border-t mt-4">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={lang === 'ar' ? 'اكتب تعليقاً...' : 'Write a comment...'}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendComment()}
              disabled={sending}
            />
            <Button 
              onClick={sendComment} 
              disabled={!newComment.trim() || sending}
              className="gradient-primary"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PostCommentsModal;
