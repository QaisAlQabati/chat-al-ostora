import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Heart, Send, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  view_count: number;
  created_at: string;
}

interface StoryComment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profile: {
    display_name: string;
    profile_picture: string | null;
  };
}

interface StoryViewerProps {
  stories: Story[];
  userInfo: {
    userId: string;
    username: string;
    displayName: string;
    profilePicture: string | null;
    isVerified: boolean;
    isVip: boolean;
  };
  onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, userInfo, onClose }) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState('');

  // ── إعجاب (جديد) ─────────────────────────────────────────────
  const [isLiked, setIsLiked]       = useState(false);
  const [likeCount, setLikeCount]   = useState(0);
  const [likingAnim, setLikingAnim] = useState(false);

  // ── تعليقات (جديد) ───────────────────────────────────────────
  const [comments, setComments]         = useState<StoryComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [paused, setPaused]             = useState(false);

  const currentStory = stories[currentIndex];

  // ── جلب بيانات الإعجاب والتعليقات عند تغيير الاستوري ─────────
  useEffect(() => {
    if (currentStory) {
      fetchLikes();
      fetchComments();
    }
  }, [currentIndex, currentStory]);

  useEffect(() => {
    if (user && currentStory) {
      supabase
        .from('story_views')
        .upsert({ story_id: currentStory.id, viewer_id: user.id })
        .then(() => {});
    }
  }, [currentIndex, user, currentStory]);

  // ── التقدم التلقائي (يتوقف عند فتح التعليقات) ───────────────
  useEffect(() => {
    if (paused) return;
    const duration = currentStory?.media_type === 'video' ? 30000 : 5000;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [currentIndex, stories.length, currentStory, onClose, paused]);

  // ── جلب الإعجابات ─────────────────────────────────────────────
  const fetchLikes = async () => {
    if (!currentStory) return;
    const { data: countData } = await supabase
      .from('story_likes')
      .select('id', { count: 'exact' })
      .eq('story_id', currentStory.id);
    setLikeCount(countData?.length || 0);

    if (user) {
      const { data: myLike } = await supabase
        .from('story_likes')
        .select('id')
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsLiked(!!myLike);
    }
  };

  // ── تبديل الإعجاب ─────────────────────────────────────────────
  const handleToggleLike = async () => {
    if (!user || !currentStory) return;
    setLikingAnim(true);
    setTimeout(() => setLikingAnim(false), 400);

    if (isLiked) {
      await supabase
        .from('story_likes')
        .delete()
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id);
      setIsLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from('story_likes')
        .insert({ story_id: currentStory.id, user_id: user.id });
      setIsLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  // ── جلب التعليقات ─────────────────────────────────────────────
  const fetchComments = async () => {
    if (!currentStory) return;
    const { data } = await supabase
      .from('story_comments')
      .select('*')
      .eq('story_id', currentStory.id)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const withProfiles = await Promise.all(
        data.map(async (c) => {
          const { data: p } = await supabase
            .from('profiles')
            .select('display_name, profile_picture')
            .eq('user_id', c.user_id)
            .single();
          return { ...c, profile: p };
        })
      );
      setComments(withProfiles as StoryComment[]);
    } else {
      setComments([]);
    }
  };

  // ── إرسال تعليق ───────────────────────────────────────────────
  const handleSendComment = async () => {
    if (!user || !currentStory || !commentText.trim()) return;
    setSendingComment(true);
    await supabase
      .from('story_comments')
      .insert({ story_id: currentStory.id, user_id: user.id, comment: commentText.trim() });
    setCommentText('');
    await fetchComments();
    setSendingComment(false);
  };

  // ── فتح/إغلاق التعليقات ───────────────────────────────────────
  const toggleComments = () => {
    setShowComments((v) => !v);
    setPaused((v) => !v);
  };

  const handlePrev = () => {
    if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setProgress(0); }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) { setCurrentIndex(currentIndex + 1); setProgress(0); }
    else onClose();
  };

  // ── استخراج النص المتراكب من caption ─────────────────────────
  let overlayText = '';
  let overlayColor = '#ffffff';
  let plainCaption = currentStory?.caption || '';
  try {
    const parsed = JSON.parse(currentStory?.caption || '{}');
    if (parsed.overlayText) { overlayText = parsed.overlayText; overlayColor = parsed.overlayColor || '#ffffff'; }
    if (parsed.text) plainCaption = parsed.text;
  } catch (_) {}

  // ── استوري نصي ────────────────────────────────────────────────
  let textStoryData: { content: string; backgroundColor: string; textColor: string } | null = null;
  if (currentStory?.media_type === 'text') {
    try {
      const base64 = currentStory.media_url.split(',')[1];
      textStoryData = JSON.parse(decodeURIComponent(escape(atob(base64))));
    } catch (_) {}
  }

  const timeAgo = formatDistanceToNow(new Date(currentStory?.created_at || new Date()), {
    addSuffix: true,
    locale: lang === 'ar' ? ar : enUS,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full flex items-center justify-center">

        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
              {userInfo.profilePicture ? (
                <img src={userInfo.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-bold">
                  {userInfo.displayName[0]}
                </div>
              )}
            </div>
            <div className="text-white">
              <p className="font-semibold">{userInfo.displayName}</p>
              <p className="text-xs text-white/70">{timeAgo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Story Content */}
        <div className="w-full h-full">
          {currentStory?.media_type === 'text' && textStoryData ? (
            // ✅ استوري نصي مع خلفية مختارة
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{ background: textStoryData.backgroundColor }}
            >
              <p
                className="text-3xl font-bold text-center break-words max-w-full"
                style={{ color: textStoryData.textColor }}
              >
                {textStoryData.content}
              </p>
            </div>
          ) : currentStory?.media_type === 'video' ? (
            <video src={currentStory.media_url} className="w-full h-full object-contain" autoPlay playsInline />
          ) : (
            <img src={currentStory?.media_url} alt="" className="w-full h-full object-contain" />
          )}
        </div>

        {/* ✅ النص المتراكب على الصورة/الفيديو */}
        {overlayText ? (
          <div className="absolute bottom-32 left-0 right-0 px-4">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3">
              <p className="text-center font-semibold text-lg break-words" style={{ color: overlayColor }}>
                {overlayText}
              </p>
            </div>
          </div>
        ) : plainCaption ? (
          <div className="absolute bottom-32 left-4 right-4 text-center">
            <p className="text-white text-lg">{plainCaption}</p>
          </div>
        ) : null}

        {/* Navigation Areas */}
        <button onClick={handlePrev} className="absolute left-0 top-0 bottom-0 w-1/3" />
        <button onClick={handleNext} className="absolute right-0 top-0 bottom-0 w-1/3" />

        {/* ══ Footer: إعجاب + تعليق + رد ════════════════════════ */}
        <div className="absolute bottom-4 left-4 right-4 z-10 space-y-2">

          {/* ✅ قسم التعليقات — يظهر عند الضغط */}
          {showComments && (
            <div className="bg-black/70 backdrop-blur-md rounded-2xl p-3 max-h-52 overflow-y-auto space-y-2">
              {comments.length === 0 ? (
                <p className="text-white/50 text-xs text-center py-2">
                  {lang === 'ar' ? 'لا توجد تعليقات بعد' : 'No comments yet'}
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/20">
                      {c.profile?.profile_picture
                        ? <img src={c.profile.profile_picture} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                            {c.profile?.display_name?.[0] || '?'}
                          </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white/70 text-xs font-semibold mr-1">
                        {c.profile?.display_name}
                      </span>
                      <span className="text-white text-xs break-words">{c.comment}</span>
                    </div>
                  </div>
                ))
              )}
              {/* حقل كتابة تعليق */}
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder={lang === 'ar' ? 'اكتب تعليقاً...' : 'Write a comment...'}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                  className="flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm h-8"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white h-8 w-8"
                  disabled={sendingComment || !commentText.trim()}
                  onClick={handleSendComment}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* شريط الأزرار السفلي */}
          <div className="flex items-center gap-2">
            <Input
              placeholder={lang === 'ar' ? 'رد على الاستوري...' : 'Reply to story...'}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/50"
            />

            {/* ✅ زر الإعجاب */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white relative"
              onClick={handleToggleLike}
            >
              <Heart
                className={`w-6 h-6 transition-all ${likingAnim ? 'scale-150' : 'scale-100'}
                  ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
              />
              {likeCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {likeCount > 9 ? '9+' : likeCount}
                </span>
              )}
            </Button>

            {/* ✅ زر التعليقات */}
            <Button
              size="icon"
              variant="ghost"
              className={`text-white relative ${showComments ? 'bg-white/20' : ''}`}
              onClick={toggleComments}
            >
              <MessageCircle className="w-6 h-6" />
              {comments.length > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {comments.length > 9 ? '9+' : comments.length}
                </span>
              )}
            </Button>

            <Button size="icon" variant="ghost" className="text-white">
              <Send className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* ✅ عدد المشاهدات + الإعجابات (لصاحب الاستوري فقط) */}
        {user?.id === userInfo.userId && (
          <div className="absolute bottom-20 left-4 flex items-center gap-3 text-white/70">
            <div className="flex items-center gap-1">
              <Eye className="w-5 h-5" />
              <span className="text-sm">{currentStory?.view_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 fill-red-400 text-red-400" />
              <span className="text-sm">{likeCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewer;
