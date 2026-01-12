import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profile: {
    username: string;
    display_name: string;
    profile_picture: string | null;
    is_verified: boolean;
    is_vip: boolean;
  };
}

interface GroupedStory {
  userId: string;
  username: string;
  displayName: string;
  profilePicture: string | null;
  isVerified: boolean;
  isVip: boolean;
  stories: Story[];
  hasUnviewed: boolean;
}

interface StoriesBarProps {
  onAddStory: () => void;
  onViewStory: (story: GroupedStory) => void;
}

const StoriesBar: React.FC<StoriesBarProps> = ({ onAddStory, onViewStory }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [groupedStories, setGroupedStories] = useState<GroupedStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profile:profiles!stories_user_id_fkey(
            username,
            display_name,
            profile_picture,
            is_verified,
            is_vip
          )
        `)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group stories by user
      const grouped = (data || []).reduce((acc: Record<string, GroupedStory>, story: any) => {
        if (!acc[story.user_id]) {
          acc[story.user_id] = {
            userId: story.user_id,
            username: story.profile?.username || 'user',
            displayName: story.profile?.display_name || 'User',
            profilePicture: story.profile?.profile_picture,
            isVerified: story.profile?.is_verified || false,
            isVip: story.profile?.is_vip || false,
            stories: [],
            hasUnviewed: true, // We'd check this against story_views
          };
        }
        acc[story.user_id].stories.push(story);
        return acc;
      }, {});

      setGroupedStories(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2">
        {/* Add Story Button */}
        <button
          onClick={onAddStory}
          className="flex flex-col items-center gap-1 min-w-[72px]"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-primary">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">{t('addStory')}</span>
        </button>

        {/* Stories */}
        {groupedStories.map((group) => (
          <button
            key={group.userId}
            onClick={() => onViewStory(group)}
            className="flex flex-col items-center gap-1 min-w-[72px]"
          >
            <div className={cn(
              "p-[3px] rounded-full",
              group.hasUnviewed ? "story-ring" : "bg-muted"
            )}>
              <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-background">
                {group.profilePicture ? (
                  <img
                    src={group.profilePicture}
                    alt={group.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold">
                    {group.displayName[0]}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-foreground truncate max-w-[72px]">
              {group.displayName}
            </span>
          </button>
        ))}

        {groupedStories.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">{t('noStories')}</p>
        )}
      </div>
    </div>
  );
};

export default StoriesBar;
