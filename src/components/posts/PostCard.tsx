import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, ThumbsUp, ThumbsDown, MessageCircle, MoreVertical,
  Trash2, Lock, Unlock, Share, Verified, Crown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import PostCommentsModal from './PostCommentsModal';

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string;
  hashtags: string[];
  allow_comments: boolean;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  created_at: string;
  profile?: {
    display_name: string;
    username: string;
    profile_picture: string | null;
    is_verified: boolean;
    is_vip: boolean;
  };
  my_reaction?: string | null;
}

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate }) => {
  const { lang } = useLanguage();
  const { user, isOwner } = useAuth();
  const navigate = useNavigate();
  
  const [showComments, setShowComments] = useState(false);
  const [localReaction, setLocalReaction] = useState(post.my_reaction);
  const [likeCounts, setLikeCounts] = useState({
    like: post.like_count,
    dislike: post.dislike_count,
  });

  const isMyPost = user?.id === post.user_id;

  const handleReaction = async (reactionType: 'like' | 'dislike' | 'love') => {
    if (!user) return;

    try {
      if (localReaction === reactionType) {
        // Remove reaction
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        setLocalReaction(null);
        setLikeCounts(prev => ({
          ...prev,
          [reactionType === 'love' ? 'like' : reactionType]: 
            prev[reactionType === 'love' ? 'like' : reactionType] - 1,
        }));
      } else {
        // Add or update reaction
        const { error } = await supabase
          .from('post_reactions')
          .upsert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: reactionType,
          }, {
            onConflict: 'post_id,user_id'
          });

        if (error) throw error;

        // Update local counts
        if (localReaction) {
          setLikeCounts(prev => ({
            ...prev,
            [localReaction === 'love' ? 'like' : localReaction]: 
              prev[localReaction === 'love' ? 'like' : localReaction as 'like' | 'dislike'] - 1,
            [reactionType === 'love' ? 'like' : reactionType]: 
              prev[reactionType === 'love' ? 'like' : reactionType] + 1,
          }));
        } else {
          setLikeCounts(prev => ({
            ...prev,
            [reactionType === 'love' ? 'like' : reactionType]: 
              prev[reactionType === 'love' ? 'like' : reactionType] + 1,
          }));
        }
        
        setLocalReaction(reactionType);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('id', post.id);

      if (error) throw error;
      
      toast.success(lang === 'ar' ? 'تم حذف المنشور' : 'Post deleted');
      onUpdate();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(lang === 'ar' ? 'فشل حذف المنشور' : 'Failed to delete post');
    }
  };

  const toggleComments = async () => {
    if (!isMyPost) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ allow_comments: !post.allow_comments })
        .eq('id', post.id);

      if (error) throw error;
      
      toast.success(
        post.allow_comments 
          ? (lang === 'ar' ? 'تم قفل التعليقات' : 'Comments locked')
          : (lang === 'ar' ? 'تم فتح التعليقات' : 'Comments unlocked')
      );
      onUpdate();
    } catch (error) {
      console.error('Error toggling comments:', error);
    }
  };

  const handleHashtagClick = (tag: string) => {
    navigate(`/posts?hashtag=${tag}`);
  };

  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: lang === 'ar' ? ar : enUS,
    });
  };

  // Render content with clickable hashtags
  const renderContent = (content: string) => {
    const parts = content.split(/(#[\w\u0600-\u06FF]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.replace('#', '');
        return (
          <button
            key={i}
            onClick={() => handleHashtagClick(tag)}
            className="text-primary hover:underline font-medium"
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <>
      <Card className="overflow-hidden hover:ring-1 hover:ring-primary/20 transition-all">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Avatar 
              className="w-10 h-10 cursor-pointer"
              onClick={() => navigate(`/profile/${post.user_id}`)}
            >
              <AvatarImage src={post.profile?.profile_picture || ''} />
              <AvatarFallback>{post.profile?.display_name?.[0]}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span 
                  className="font-semibold cursor-pointer hover:underline"
                  onClick={() => navigate(`/profile/${post.user_id}`)}
                >
                  {post.profile?.display_name}
                </span>
                {post.profile?.is_verified && (
                  <Verified className="w-4 h-4 text-primary" />
                )}
                {post.profile?.is_vip && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                @{post.profile?.username} • {formatDate(post.created_at)}
              </p>
            </div>

            {(isMyPost || isOwner) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isMyPost && (
                    <DropdownMenuItem onClick={toggleComments}>
                      {post.allow_comments ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {lang === 'ar' ? 'قفل التعليقات' : 'Lock Comments'}
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          {lang === 'ar' ? 'فتح التعليقات' : 'Unlock Comments'}
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {lang === 'ar' ? 'حذف' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content */}
          {post.content && (
            <div className="mt-3 whitespace-pre-wrap">
              {renderContent(post.content)}
            </div>
          )}

          {/* Hashtags */}
          {post.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.hashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleHashtagClick(tag)}
                  className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Media */}
          {post.media_url && (
            <div className="mt-3 rounded-lg overflow-hidden bg-muted">
              {post.media_type === 'image' && (
                <img 
                  src={post.media_url} 
                  alt="" 
                  className="w-full max-h-96 object-contain"
                />
              )}
              {post.media_type === 'video' && (
                <video 
                  src={post.media_url} 
                  controls 
                  className="w-full max-h-96"
                />
              )}
              {post.media_type === 'audio' && (
                <div className="p-4">
                  <audio src={post.media_url} controls className="w-full" />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction('love')}
              className={`gap-1 ${localReaction === 'love' ? 'text-red-500' : ''}`}
            >
              <Heart className={`w-4 h-4 ${localReaction === 'love' ? 'fill-current' : ''}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction('like')}
              className={`gap-1 ${localReaction === 'like' ? 'text-primary' : ''}`}
            >
              <ThumbsUp className={`w-4 h-4 ${localReaction === 'like' ? 'fill-current' : ''}`} />
              <span className="text-xs">{likeCounts.like}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction('dislike')}
              className={`gap-1 ${localReaction === 'dislike' ? 'text-destructive' : ''}`}
            >
              <ThumbsDown className={`w-4 h-4 ${localReaction === 'dislike' ? 'fill-current' : ''}`} />
              <span className="text-xs">{likeCounts.dislike}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(true)}
              className="gap-1"
              disabled={!post.allow_comments && !isMyPost}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{post.comment_count}</span>
              {!post.allow_comments && <Lock className="w-3 h-3 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments Modal */}
      <PostCommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        post={post}
        onUpdate={onUpdate}
      />
    </>
  );
};

export default PostCard;
