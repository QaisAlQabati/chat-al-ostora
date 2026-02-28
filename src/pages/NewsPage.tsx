import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ChevronLeft, Plus, ThumbsUp, ThumbsDown, MessageCircle,
  Send, X, Image, Video, Loader2, Trash2, MoreVertical, Play, Database
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ===================== TYPES =====================
interface NewsPost {
  id: string;
  title: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  author_id: string;
  author?: { display_name: string; profile_picture: string | null };
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  user_reaction?: 'like' | 'dislike' | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user?: { display_name: string; profile_picture: string | null };
}

// ===================== ADMIN ROLES =====================
const ADMIN_ROLES = ['owner', 'super_owner', 'super_admin', 'admin'];

// ===================== COMMENT SECTION =====================
const CommentSection: React.FC<{ newsId: string; currentUserId: string; isAdmin: boolean }> = ({ newsId, currentUserId, isAdmin }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchComments(); }, [newsId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('news_comments')
      .select('*, user:profiles(display_name, profile_picture)')
      .eq('news_id', newsId)
      .order('created_at', { ascending: true });
    setComments((data as any[]) || []);
    setLoading(false);
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    const { error } = await supabase.from('news_comments').insert({
      news_id: newsId,
      user_id: currentUserId,
      content: newComment.trim(),
    });
    if (error) { toast.error('فشل إرسال التعليق'); setSending(false); return; }
    setNewComment('');
    await fetchComments();
    setSending(false);
  };

  const deleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== currentUserId && !isAdmin) return;
    await supabase.from('news_comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  return (
    <div className="border-t border-white/10 pt-3 mt-2 space-y-3">
      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-white/40" /></div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-center text-white/30 text-xs py-2">لا توجد تعليقات بعد</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2 group" dir="rtl">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                {c.user?.profile_picture
                  ? <img src={c.user.profile_picture} alt="" className="w-full h-full object-cover" />
                  : <span className="w-full h-full flex items-center justify-center text-[10px] text-white/50">{c.user?.display_name?.charAt(0)}</span>}
              </div>
              <div className="flex-1 bg-white/5 rounded-xl px-3 py-1.5">
                <p className="text-[11px] font-bold text-cyan-400">{c.user?.display_name}</p>
                <p className="text-xs text-white/80">{c.content}</p>
                <p className="text-[9px] text-white/20 mt-0.5">{new Date(c.created_at).toLocaleString('ar-EG')}</p>
              </div>
              {(c.user_id === currentUserId || isAdmin) && (
                <button onClick={() => deleteComment(c.id, c.user_id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-all flex-shrink-0 mt-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2" dir="rtl">
        <Input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="اكتب تعليقاً..."
          className="flex-1 bg-white/5 border-white/10 text-sm h-8 text-right"
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendComment()}
        />
        <Button size="icon" className="h-8 w-8 gradient-primary flex-shrink-0" onClick={sendComment} disabled={sending || !newComment.trim()}>
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
};

// ===================== NEWS CARD =====================
const NewsCard: React.FC<{
  post: NewsPost;
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onReaction: (id: string, type: 'like' | 'dislike') => void;
}> = ({ post, currentUserId, isAdmin, onDelete, onReaction }) => {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3" dir="rtl">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
            {post.author?.profile_picture
              ? <img src={post.author.profile_picture} alt="" className="w-full h-full object-cover" />
              : <span className="w-full h-full flex items-center justify-center text-sm text-white/50">{post.author?.display_name?.charAt(0)}</span>}
          </div>
          <div>
            <p className="text-sm font-bold text-cyan-400">{post.author?.display_name}</p>
            <p className="text-[10px] text-white/30">{new Date(post.created_at).toLocaleString('ar-EG')}</p>
          </div>
        </div>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />حذف الخبر
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {post.title && (
        <div className="px-4 pb-1" dir="rtl">
          <h3 className="font-bold text-base text-white">{post.title}</h3>
        </div>
      )}

      {post.content && (
        <div className="px-4 pb-3" dir="rtl">
          <p className="text-sm text-white/75 leading-relaxed">{post.content}</p>
        </div>
      )}

      {post.media_url && post.media_type === 'image' && (
        <div className="w-full max-h-80 overflow-hidden">
          <img src={post.media_url} alt="" className="w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => window.open(post.media_url!, '_blank')} />
        </div>
      )}
      {post.media_url && post.media_type === 'video' && (
        <div className="relative w-full bg-black">
          <video src={post.media_url} controls className="w-full max-h-72" />
        </div>
      )}

      <div className="flex items-center gap-1 px-4 py-2.5 border-t border-white/5" dir="rtl">
        <button
          onClick={() => onReaction(post.id, 'like')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
            ${post.user_reaction === 'like' ? 'bg-green-500/20 text-green-400' : 'text-white/40 hover:bg-white/10 hover:text-green-400'}`}
        >
          <ThumbsUp className="w-4 h-4" />
          <span className="text-xs">{post.likes_count}</span>
        </button>

        <button
          onClick={() => onReaction(post.id, 'dislike')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
            ${post.user_reaction === 'dislike' ? 'bg-red-500/20 text-red-400' : 'text-white/40 hover:bg-white/10 hover:text-red-400'}`}
        >
          <ThumbsDown className="w-4 h-4" />
          <span className="text-xs">{post.dislikes_count}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
            ${showComments ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:bg-white/10 hover:text-cyan-400'}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs">{post.comments_count}</span>
        </button>
      </div>

      {showComments && (
        <div className="px-4 pb-4">
          <CommentSection newsId={post.id} currentUserId={currentUserId} isAdmin={isAdmin} />
        </div>
      )}
    </div>
  );
};

// ===================== CREATE NEWS MODAL =====================
const CreateNewsModal: React.FC<{ onClose: () => void; onCreated: () => void; authorId: string }> = ({ onClose, onCreated, authorId }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) { toast.error('فقط صور وفيديوهات مسموح'); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error('الحجم الأقصى 50MB'); return; }
    setMediaFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!title.trim() && !content.trim() && !mediaFile) {
      toast.error('أضف عنواناً أو محتوى أو وسائط');
      return;
    }
    setSaving(true);
    try {
      let mediaUrl: string | null = null;
      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop();
        const path = `news/${authorId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('chat-media').upload(path, mediaFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from('news_posts').insert({
        author_id: authorId,
        title: title.trim() || null,
        content: content.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
      });
      if (error) throw error;
      toast.success('تم نشر الخبر ✅');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('فشل نشر الخبر');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center p-0" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0f0f1a] border-t border-white/10 rounded-t-3xl p-5 space-y-4 animate-slide-up"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between" dir="rtl">
          <h2 className="text-lg font-bold text-white">📰 نشر خبر جديد</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3" dir="rtl">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="عنوان الخبر (اختياري)"
            className="bg-white/5 border-white/10 text-right font-bold"
          />
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="محتوى الخبر..."
            rows={4}
            className="bg-white/5 border-white/10 text-right resize-none"
          />

          {mediaPreview && (
            <div className="relative rounded-xl overflow-hidden">
              {mediaType === 'image'
                ? <img src={mediaPreview} alt="" className="w-full max-h-48 object-cover" />
                : <video src={mediaPreview} className="w-full max-h-48" controls />}
              <button onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(null); }}
                className="absolute top-2 left-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all">
              <Image className="w-4 h-4 text-blue-400" /> صورة
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all">
              <Video className="w-4 h-4 text-purple-400" /> فيديو
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={saving} className="w-full gradient-primary h-11 text-base font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '🚀 نشر الخبر'}
        </Button>
      </div>
    </div>
  );
};

// ===================== MAIN NEWS PAGE =====================
const NewsPage: React.FC = () => {
  const { user, profile, isOwner } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [setupDone, setSetupDone] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  const isAdmin = isOwner || userRoles.some(r => ADMIN_ROLES.includes(r)) || ADMIN_ROLES.includes(profile?.role || '');

  useEffect(() => {
    if (user) { fetchUserRoles(); fetchPosts(); }
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    setUserRoles((data || []).map((r: any) => r.role));
  };

  // ✅ إنشاء الجداول تلقائياً بدون Supabase Dashboard
  const setupTables = async () => {
    setSettingUp(true);
    try {
      // جرب تقرأ من الجدول - إذا شتغل يعني موجود
      const { error: testError } = await supabase.from('news_posts').select('id').limit(1);
      if (!testError) {
        toast.success('الجداول موجودة بالفعل ✅');
        setSetupDone(true);
        fetchPosts();
        setSettingUp(false);
        return;
      }

      // الجداول مو موجودة - أخبر المستخدم
      toast.error('الجداول غير موجودة، تواصل مع المطور لإضافتها');
    } catch (err) {
      toast.error('حدث خطأ');
    } finally {
      setSettingUp(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data: postsData, error } = await supabase
        .from('news_posts')
        .select('*, author:profiles(display_name, profile_picture)')
        .order('created_at', { ascending: false });

      // إذا الجدول مو موجود
      if (error?.code === '42P01') {
        setSetupDone(false);
        setLoading(false);
        return;
      }

      setSetupDone(true);
      if (!postsData) { setLoading(false); return; }

      const enriched = await Promise.all(postsData.map(async (p: any) => {
        const [{ count: likesCount }, { count: dislikesCount }, { count: commentsCount }, { data: myReaction }] = await Promise.all([
          supabase.from('news_reactions').select('*', { count: 'exact', head: true }).eq('news_id', p.id).eq('type', 'like'),
          supabase.from('news_reactions').select('*', { count: 'exact', head: true }).eq('news_id', p.id).eq('type', 'dislike'),
          supabase.from('news_comments').select('*', { count: 'exact', head: true }).eq('news_id', p.id),
          supabase.from('news_reactions').select('type').eq('news_id', p.id).eq('user_id', user?.id || '').maybeSingle(),
        ]);
        return {
          ...p,
          likes_count: likesCount || 0,
          dislikes_count: dislikesCount || 0,
          comments_count: commentsCount || 0,
          user_reaction: myReaction?.type || null,
        };
      }));

      setPosts(enriched);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (newsId: string, type: 'like' | 'dislike') => {
    if (!user) return;
    const post = posts.find(p => p.id === newsId);
    if (!post) return;

    const isSame = post.user_reaction === type;

    setPosts(prev => prev.map(p => {
      if (p.id !== newsId) return p;
      const wasLike = p.user_reaction === 'like';
      const wasDislike = p.user_reaction === 'dislike';
      return {
        ...p,
        user_reaction: isSame ? null : type,
        likes_count: type === 'like'
          ? isSame ? p.likes_count - 1 : p.likes_count + (wasLike ? 0 : 1)
          : wasLike ? p.likes_count - 1 : p.likes_count,
        dislikes_count: type === 'dislike'
          ? isSame ? p.dislikes_count - 1 : p.dislikes_count + (wasDislike ? 0 : 1)
          : wasDislike ? p.dislikes_count - 1 : p.dislikes_count,
      };
    }));

    if (isSame) {
      await supabase.from('news_reactions').delete().eq('news_id', newsId).eq('user_id', user.id);
    } else {
      await supabase.from('news_reactions').upsert({ news_id: newsId, user_id: user.id, type }, { onConflict: 'news_id,user_id' });
    }
  };

  const handleDelete = async (newsId: string) => {
    await supabase.from('news_posts').delete().eq('id', newsId);
    setPosts(prev => prev.filter(p => p.id !== newsId));
    toast.success('تم حذف الخبر');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-dark border-b border-border/30 px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xl">📰</span>
          <h1 className="font-bold text-lg">{lang === 'ar' ? 'الأخبار' : 'News'}</h1>
        </div>
        {isAdmin ? (
          <Button size="sm" className="gradient-primary gap-1.5 h-8 px-3" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            <span className="text-xs">{lang === 'ar' ? 'خبر جديد' : 'New'}</span>
          </Button>
        ) : <div className="w-9" />}
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ✅ شاشة إعداد الجداول - تظهر فقط لو الجداول مو موجودة */}
        {!setupDone && !loading && isAdmin && (
          <div className="text-center py-16 space-y-4">
            <span className="text-5xl">🗄️</span>
            <p className="text-white font-bold text-lg">الجداول غير موجودة</p>
            <p className="text-white/40 text-sm">تحتاج تضيف الجداول في Supabase أولاً</p>
            <div className="bg-black/30 rounded-xl p-4 text-left text-xs text-white/60 font-mono" dir="ltr">
              <p className="text-cyan-400 mb-2"># انسخ هذا في Supabase SQL Editor:</p>
              <p>CREATE TABLE news_posts (</p>
              <p className="pr-4">id UUID DEFAULT gen_random_uuid() PRIMARY KEY,</p>
              <p className="pr-4">author_id UUID NOT NULL,</p>
              <p className="pr-4">title TEXT,</p>
              <p className="pr-4">content TEXT,</p>
              <p className="pr-4">media_url TEXT,</p>
              <p className="pr-4">media_type TEXT,</p>
              <p className="pr-4">created_at TIMESTAMPTZ DEFAULT NOW()</p>
              <p>);</p>
              <br/>
              <p>CREATE TABLE news_reactions (</p>
              <p className="pr-4">id UUID DEFAULT gen_random_uuid() PRIMARY KEY,</p>
              <p className="pr-4">news_id UUID NOT NULL,</p>
              <p className="pr-4">user_id UUID NOT NULL,</p>
              <p className="pr-4">type TEXT NOT NULL,</p>
              <p className="pr-4">created_at TIMESTAMPTZ DEFAULT NOW(),</p>
              <p className="pr-4">UNIQUE(news_id, user_id)</p>
              <p>);</p>
              <br/>
              <p>CREATE TABLE news_comments (</p>
              <p className="pr-4">id UUID DEFAULT gen_random_uuid() PRIMARY KEY,</p>
              <p className="pr-4">news_id UUID NOT NULL,</p>
              <p className="pr-4">user_id UUID NOT NULL,</p>
              <p className="pr-4">content TEXT NOT NULL,</p>
              <p className="pr-4">created_at TIMESTAMPTZ DEFAULT NOW()</p>
              <p>);</p>
              <br/>
              <p>ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;</p>
              <p>ALTER TABLE news_reactions ENABLE ROW LEVEL SECURITY;</p>
              <p>ALTER TABLE news_comments ENABLE ROW LEVEL SECURITY;</p>
              <br/>
              <p>CREATE POLICY "all" ON news_posts FOR ALL USING (true) WITH CHECK (true);</p>
              <p>CREATE POLICY "all" ON news_reactions FOR ALL USING (true) WITH CHECK (true);</p>
              <p>CREATE POLICY "all" ON news_comments FOR ALL USING (true) WITH CHECK (true);</p>
            </div>
            <Button onClick={setupTables} disabled={settingUp} className="gradient-primary gap-2">
              {settingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              تحقق من الجداول
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : setupDone && posts.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <span className="text-5xl">📭</span>
            <p className="text-white/40">{lang === 'ar' ? 'لا توجد أخبار بعد' : 'No news yet'}</p>
            {isAdmin && (
              <Button onClick={() => setShowCreate(true)} className="gradient-primary mt-2">
                انشر أول خبر
              </Button>
            )}
          </div>
        ) : (
          posts.map(post => (
            <NewsCard
              key={post.id}
              post={post}
              currentUserId={user?.id || ''}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onReaction={handleReaction}
            />
          ))
        )}
      </div>

      {showCreate && (
        <CreateNewsModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchPosts}
          authorId={user?.id || ''}
        />
      )}
    </div>
  );
};

export default NewsPage;
