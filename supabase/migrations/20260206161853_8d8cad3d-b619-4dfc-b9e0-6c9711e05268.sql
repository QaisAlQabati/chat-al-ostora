-- Create posts table for hashtag/posts system
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type VARCHAR DEFAULT 'text', -- text, image, video, audio
  hashtags JSONB DEFAULT '[]'::jsonb,
  allow_comments BOOLEAN DEFAULT true,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create post_reactions table (likes/dislikes)
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type VARCHAR NOT NULL DEFAULT 'like', -- like, dislike, love
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" 
ON public.posts FOR SELECT 
USING (is_deleted = false);

CREATE POLICY "Users can create their own posts" 
ON public.posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON public.posts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.posts FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Owner can manage all posts" 
ON public.posts FOR ALL 
USING (is_owner(auth.uid()));

-- Post reactions policies
CREATE POLICY "Reactions are viewable by everyone" 
ON public.post_reactions FOR SELECT 
USING (true);

CREATE POLICY "Users can add their own reactions" 
ON public.post_reactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" 
ON public.post_reactions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
ON public.post_reactions FOR DELETE 
USING (auth.uid() = user_id);

-- Post comments policies
CREATE POLICY "Comments are viewable by everyone" 
ON public.post_comments FOR SELECT 
USING (is_deleted = false);

CREATE POLICY "Users can add their own comments" 
ON public.post_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.post_comments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.post_comments FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Owner can manage all comments" 
ON public.post_comments FOR ALL 
USING (is_owner(auth.uid()));

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- Create function to update post counts
CREATE OR REPLACE FUNCTION public.update_post_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'like' OR NEW.reaction_type = 'love' THEN
      UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.reaction_type = 'dislike' THEN
      UPDATE public.posts SET dislike_count = dislike_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'like' OR OLD.reaction_type = 'love' THEN
      UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.reaction_type = 'dislike' THEN
      UPDATE public.posts SET dislike_count = GREATEST(dislike_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle reaction type change
    IF OLD.reaction_type != NEW.reaction_type THEN
      -- Remove old count
      IF OLD.reaction_type = 'like' OR OLD.reaction_type = 'love' THEN
        UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
      ELSIF OLD.reaction_type = 'dislike' THEN
        UPDATE public.posts SET dislike_count = GREATEST(dislike_count - 1, 0) WHERE id = OLD.post_id;
      END IF;
      -- Add new count
      IF NEW.reaction_type = 'like' OR NEW.reaction_type = 'love' THEN
        UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
      ELSIF NEW.reaction_type = 'dislike' THEN
        UPDATE public.posts SET dislike_count = dislike_count + 1 WHERE id = NEW.post_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for reaction counts
CREATE TRIGGER update_post_reaction_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.post_reactions
FOR EACH ROW EXECUTE FUNCTION public.update_post_reaction_count();

-- Create function to update comment count
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for comment counts
CREATE TRIGGER update_post_comment_count_trigger
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();