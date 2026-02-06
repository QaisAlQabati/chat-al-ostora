import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, Image, Mic, Video, Send, Hash, Heart, ThumbsUp, 
  ThumbsDown, MessageCircle, MoreVertical, X, Search, ArrowLeft
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import PostCard from '@/components/posts/PostCard';
import CreatePostModal from '@/components/posts/CreatePostModal';

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

const Posts: React.FC = () => {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hashtagFilter = searchParams.get('hashtag');

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchHashtag, setSearchHashtag] = useState(hashtagFilter || '');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPosts();

    // Subscribe to new posts
    const channel = supabase
      .channel('posts_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
      }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, hashtagFilter]);

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (hashtagFilter) {
        query = query.contains('hashtags', [hashtagFilter]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles and reactions for each post
      const postsWithDetails = await Promise.all(
        (data || []).map(async (post) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, username, profile_picture, is_verified, is_vip')
            .eq('user_id', post.user_id)
            .single();

          let myReaction = null;
          if (user) {
            const { data: reactionData } = await supabase
              .from('post_reactions')
              .select('reaction_type')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();
            myReaction = reactionData?.reaction_type || null;
          }

          // Parse hashtags from JSON
          let parsedHashtags: string[] = [];
          if (Array.isArray(post.hashtags)) {
            parsedHashtags = post.hashtags as string[];
          }

          return {
            ...post,
            hashtags: parsedHashtags,
            profile: profileData,
            my_reaction: myReaction,
          };
        })
      );

      setPosts(postsWithDetails as Post[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchHashtag.trim()) {
      const tag = searchHashtag.replace('#', '').trim();
      navigate(`/posts?hashtag=${tag}`);
    } else {
      navigate('/posts');
    }
  };

  const clearFilter = () => {
    setSearchHashtag('');
    navigate('/posts');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 glass-dark border-b border-border/30 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Hash className="w-6 h-6 text-primary" />
              {lang === 'ar' ? 'المنشورات' : 'Posts'}
            </h1>
            <div className="flex-1" />
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="gradient-primary gap-2"
            >
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? 'نشر' : 'Post'}
            </Button>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchHashtag}
                onChange={(e) => setSearchHashtag(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث بالهاشتاق...' : 'Search hashtag...'}
                className="pl-9"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Active filter */}
          {hashtagFilter && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-muted-foreground">
                {lang === 'ar' ? 'نتائج البحث عن:' : 'Results for:'}
              </span>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium flex items-center gap-1">
                #{hashtagFilter}
                <button onClick={clearFilter} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Posts List */}
        <div className="p-4 space-y-4">
          {posts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Hash className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">
                  {hashtagFilter 
                    ? (lang === 'ar' ? 'لا توجد منشورات بهذا الهاشتاق' : 'No posts with this hashtag')
                    : (lang === 'ar' ? 'لا توجد منشورات بعد' : 'No posts yet')
                  }
                </h3>
                <p className="text-muted-foreground mt-2">
                  {lang === 'ar' ? 'كن أول من ينشر!' : 'Be the first to post!'}
                </p>
                <Button 
                  onClick={() => setShowCreateModal(true)} 
                  className="mt-4 gradient-primary"
                >
                  {lang === 'ar' ? 'إنشاء منشور' : 'Create Post'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={fetchPosts}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchPosts();
        }}
      />
    </MainLayout>
  );
};

export default Posts;
