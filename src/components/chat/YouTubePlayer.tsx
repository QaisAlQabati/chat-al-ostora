import React, { useState, useRef } from 'react';
import { X, Search, Play, Youtube, Send, Link, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// ─── ضع مفتاح YouTube Data API v3 هنا أو في ملف .env ───────────
// للحصول على المفتاح: https://console.cloud.google.com → YouTube Data API v3
const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface YouTubePlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (video: YouTubeVideo) => void;
}

// ─── استخراج معرّف الفيديو من أي رابط يوتيوب ────────────────────
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ isOpen, onClose, onSelectVideo }) => {
  const { lang } = useLanguage();
  const [searchQuery, setSearchQuery]   = useState('');
  const [videos, setVideos]             = useState<YouTubeVideo[]>([]);
  const [loading, setLoading]           = useState(false);
  const [currentVideo, setCurrentVideo] = useState<YouTubeVideo | null>(null);
  const [linkInput, setLinkInput]       = useState('');
  const [activeTab, setActiveTab]       = useState<'search' | 'link'>('search');

  // ─── بحث حقيقي عبر YouTube Data API v3 ──────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setVideos([]);

    try {
      if (!YT_API_KEY) {
        // ─── Fallback: استخدام YouTube oEmbed + RSS بدون مفتاح ──
        // نعرض رسالة واضحة للمطوّر
        toast.error(
          lang === 'ar'
            ? 'أضف VITE_YOUTUBE_API_KEY في ملف .env للبحث الحقيقي'
            : 'Add VITE_YOUTUBE_API_KEY in .env for real search'
        );
        setLoading(false);
        return;
      }

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&type=video&maxResults=15&q=${encodeURIComponent(searchQuery)}` +
        `&key=${YT_API_KEY}`
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || 'YouTube API error');
      }

      const data = await res.json();

      const results: YouTubeVideo[] = (data.items || []).map((item: any) => ({
        id:           item.id.videoId,
        title:        item.snippet.title,
        thumbnail:    item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        channelTitle: item.snippet.channelTitle,
      }));

      setVideos(results);

      if (results.length === 0) {
        toast.info(lang === 'ar' ? 'لا توجد نتائج' : 'No results found');
      }
    } catch (error: any) {
      console.error('YouTube search error:', error);
      toast.error(lang === 'ar' ? 'خطأ في البحث: ' + error.message : 'Search error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── إضافة فيديو عبر رابط مباشر ────────────────────────────
  const handleAddByLink = async () => {
    const videoId = extractYouTubeId(linkInput.trim());
    if (!videoId) {
      toast.error(lang === 'ar' ? 'الرابط غير صحيح' : 'Invalid YouTube link');
      return;
    }

    setLoading(true);
    try {
      // جلب معلومات الفيديو عبر oEmbed (لا يحتاج API Key)
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );

      let title = 'YouTube Video';
      let channelTitle = '';

      if (res.ok) {
        const data = await res.json();
        title        = data.title || title;
        channelTitle = data.author_name || '';
      }

      const video: YouTubeVideo = {
        id: videoId,
        title,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle,
      };

      setCurrentVideo(video);
      setLinkInput('');
      toast.success(lang === 'ar' ? 'تم تحميل الفيديو!' : 'Video loaded!');
    } catch {
      // حتى لو فشل oEmbed، نعرض الفيديو بمعرّفه
      const video: YouTubeVideo = {
        id: videoId,
        title: `YouTube Video (${videoId})`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle: '',
      };
      setCurrentVideo(video);
      setLinkInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = (video: YouTubeVideo) => {
    setCurrentVideo(video);
  };

  // ─── إرسال الفيديو للغرفة العامة ────────────────────────────
  const handleSendToRoom = () => {
    if (currentVideo) {
      onSelectVideo(currentVideo);
      setCurrentVideo(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="w-6 h-6 text-red-500" />
            {lang === 'ar' ? 'يوتيوب مدمج' : 'YouTube Integration'}
          </DialogTitle>
        </DialogHeader>

        {/* ═══ تبويبات: بحث | رابط ═══════════════════════════════ */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'search'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Search className="w-4 h-4" />
            {lang === 'ar' ? 'بحث' : 'Search'}
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'link'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Link className="w-4 h-4" />
            {lang === 'ar' ? 'رابط مباشر' : 'Direct Link'}
          </button>
        </div>

        {/* ═══ شريط البحث ════════════════════════════════════════ */}
        {activeTab === 'search' && (
          <div className="p-4 border-b border-border">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={lang === 'ar' ? 'ابحث عن فيديو أو أغنية...' : 'Search for video or song...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ إضافة رابط مباشر ══════════════════════════════════ */}
        {activeTab === 'link' && (
          <div className="p-4 border-b border-border">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={lang === 'ar'
                    ? 'الصق رابط يوتيوب هنا... (youtu.be أو youtube.com)'
                    : 'Paste YouTube link here... (youtu.be or youtube.com)'}
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddByLink()}
                  className="pl-9"
                  dir="ltr"
                />
              </div>
              <Button onClick={handleAddByLink} disabled={loading || !linkInput.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {lang === 'ar'
                ? 'يدعم: youtube.com/watch?v=... | youtu.be/... | youtube.com/shorts/...'
                : 'Supports: youtube.com/watch?v=... | youtu.be/... | youtube.com/shorts/...'}
            </p>
          </div>
        )}

        {/* ═══ معاينة الفيديو المحدد ══════════════════════════════ */}
        {currentVideo && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex gap-4">
              {/* مشغل الفيديو المصغر */}
              <div className="relative w-44 flex-shrink-0 rounded-xl overflow-hidden bg-black"
                   style={{ aspectRatio: '16/9' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&rel=0`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={currentVideo.title}
                />
              </div>

              {/* معلومات + زر الإرسال */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="font-medium line-clamp-2 text-sm leading-snug">
                    {currentVideo.title}
                  </h4>
                  {currentVideo.channelTitle && (
                    <p className="text-xs text-muted-foreground mt-1">{currentVideo.channelTitle}</p>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button className="flex-1 gradient-primary" onClick={handleSendToRoom}>
                    <Send className="w-4 h-4 mr-2" />
                    {lang === 'ar' ? 'إرسال للغرفة' : 'Send to Room'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentVideo(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ نتائج البحث ════════════════════════════════════════ */}
        <ScrollArea className="flex-1 p-4">
          {loading && videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {lang === 'ar' ? 'جاري البحث...' : 'Searching...'}
              </p>
            </div>
          ) : videos.length > 0 ? (
            <div className="space-y-2">
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleSelectVideo(video)}
                  className={`flex gap-3 p-2 rounded-xl cursor-pointer transition-all ${
                    currentVideo?.id === video.id
                      ? 'bg-primary/15 ring-1 ring-primary'
                      : 'hover:bg-muted/60'
                  }`}
                >
                  {/* صورة مصغرة */}
                  <div className="relative w-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted"
                       style={{ aspectRatio: '16/9' }}>
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center
                                    bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="w-7 h-7 text-white drop-shadow-lg" />
                    </div>
                    {currentVideo?.id === video.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                        <Play className="w-7 h-7 text-white" />
                      </div>
                    )}
                  </div>

                  {/* معلومات */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium line-clamp-2 text-sm leading-snug">{video.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{video.channelTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'search' && searchQuery && !loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}</p>
            </div>
          ) : activeTab === 'search' && !searchQuery ? (
            <div className="text-center py-12 text-muted-foreground">
              <Youtube className="w-14 h-14 mx-auto mb-3 opacity-30 text-red-400" />
              <p className="font-medium">{lang === 'ar' ? 'ابحث عن فيديو للبدء' : 'Search for a video to get started'}</p>
              <p className="text-xs mt-1 opacity-70">
                {lang === 'ar' ? 'مثال: أغاني عربية، أفلام، موسيقى...' : 'Example: music, movies, tutorials...'}
              </p>
            </div>
          ) : activeTab === 'link' ? (
            <div className="text-center py-12 text-muted-foreground">
              <Link className="w-14 h-14 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{lang === 'ar' ? 'الصق رابط يوتيوب أعلاه' : 'Paste a YouTube link above'}</p>
              <p className="text-xs mt-1 opacity-70">
                {lang === 'ar'
                  ? 'سيتحول الرابط تلقائياً إلى فيديو في الغرفة'
                  : 'The link will automatically become a video in the room'}
              </p>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubePlayer;
