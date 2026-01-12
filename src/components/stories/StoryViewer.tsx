import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Heart, Send } from 'lucide-react';
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

  const currentStory = stories[currentIndex];

  useEffect(() => {
    // Record view
    if (user && currentStory) {
      supabase
        .from('story_views')
        .upsert({
          story_id: currentStory.id,
          viewer_id: user.id,
        })
        .then(() => {});
    }
  }, [currentIndex, user, currentStory]);

  useEffect(() => {
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
  }, [currentIndex, stories.length, currentStory, onClose]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

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
          {currentStory?.media_type === 'video' ? (
            <video
              src={currentStory.media_url}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
            />
          ) : (
            <img
              src={currentStory?.media_url}
              alt=""
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Navigation Areas */}
        <button
          onClick={handlePrev}
          className="absolute left-0 top-0 bottom-0 w-1/3"
        />
        <button
          onClick={handleNext}
          className="absolute right-0 top-0 bottom-0 w-1/3"
        />

        {/* Caption */}
        {currentStory?.caption && (
          <div className="absolute bottom-20 left-4 right-4 text-center">
            <p className="text-white text-lg">{currentStory.caption}</p>
          </div>
        )}

        {/* Footer */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 z-10">
          <Input
            placeholder={lang === 'ar' ? 'رد على الاستوري...' : 'Reply to story...'}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/50"
          />
          <Button size="icon" variant="ghost" className="text-white">
            <Heart className="w-6 h-6" />
          </Button>
          <Button size="icon" variant="ghost" className="text-white">
            <Send className="w-6 h-6" />
          </Button>
        </div>

        {/* View Count (for own stories) */}
        {user?.id === userInfo.userId && (
          <div className="absolute bottom-20 left-4 flex items-center gap-2 text-white/70">
            <Eye className="w-5 h-5" />
            <span>{currentStory?.view_count || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewer;
