import React, { useState } from 'react';
import { X, Search, Play, Youtube, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ isOpen, onClose, onSelectVideo }) => {
  const { lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<YouTubeVideo | null>(null);

  // Mock search - in production, this would call YouTube API
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    
    // Mock results for demo - replace with actual YouTube API call
    setTimeout(() => {
      setVideos([
        {
          id: 'dQw4w9WgXcQ',
          title: searchQuery + ' - Video 1',
          thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          channelTitle: 'Sample Channel',
        },
        {
          id: 'jNQXAC9IVRw',
          title: searchQuery + ' - Video 2',
          thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
          channelTitle: 'Another Channel',
        },
        {
          id: '9bZkp7q19f0',
          title: searchQuery + ' - Video 3',
          thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
          channelTitle: 'Music Channel',
        },
      ]);
      setLoading(false);
    }, 500);
  };

  const handleSelectVideo = (video: YouTubeVideo) => {
    setCurrentVideo(video);
  };

  const handleSendToRoom = () => {
    if (currentVideo) {
      onSelectVideo(currentVideo);
      setCurrentVideo(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="w-6 h-6 text-red-500" />
            {lang === 'ar' ? 'يوتيوب مدمج' : 'YouTube Integration'}
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
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
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Current Video Preview */}
        {currentVideo && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex gap-4">
              <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex-1">
                <h4 className="font-medium line-clamp-2">{currentVideo.title}</h4>
                <p className="text-sm text-muted-foreground">{currentVideo.channelTitle}</p>
                <Button 
                  className="mt-3 gradient-primary"
                  onClick={handleSendToRoom}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {lang === 'ar' ? 'إرسال للغرفة' : 'Send to Room'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : videos.length > 0 ? (
            <div className="space-y-3">
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleSelectVideo(video)}
                  className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    currentVideo?.id === video.id 
                      ? 'bg-primary/20 ring-1 ring-primary' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium line-clamp-2 text-sm">{video.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{video.channelTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Youtube className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{lang === 'ar' ? 'ابحث عن فيديو للبدء' : 'Search for a video to get started'}</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubePlayer;
