-- =============================================
-- جداول نظام الأخبار
-- شغّل هذا في Supabase SQL Editor
-- =============================================

-- جدول المنشورات الإخبارية
CREATE TABLE IF NOT EXISTS news_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تفاعلات الأخبار (إعجاب / لم يعجبني)
CREATE TABLE IF NOT EXISTS news_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID REFERENCES news_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('like', 'dislike')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(news_id, user_id)  -- كل مستخدم تفاعل واحد فقط لكل خبر
);

-- جدول تعليقات الأخبار
CREATE TABLE IF NOT EXISTS news_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID REFERENCES news_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_news_posts_created_at ON news_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_reactions_news_id ON news_reactions(news_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_news_id ON news_comments(news_id);

-- صلاحيات RLS
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_comments ENABLE ROW LEVEL SECURITY;

-- news_posts: الكل يقرأ، الإدارة فقط تكتب/تحذف
CREATE POLICY "news_posts_read" ON news_posts FOR SELECT USING (true);
CREATE POLICY "news_posts_insert" ON news_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "news_posts_delete" ON news_posts FOR DELETE USING (auth.uid() = author_id);

-- news_reactions: الكل يقرأ/يكتب على تفاعلاته
CREATE POLICY "reactions_read" ON news_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert" ON news_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON news_reactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "reactions_update" ON news_reactions FOR UPDATE USING (auth.uid() = user_id);

-- news_comments: الكل يقرأ/يكتب
CREATE POLICY "comments_read" ON news_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON news_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON news_comments FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age int;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mood text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS avatar_frame text;
```

**3.** بعدين اكتب في الـ AI chat داخل Replit:
```
run the SQL migrations in news_tables.sql
