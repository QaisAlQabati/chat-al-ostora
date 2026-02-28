-- أضف هذا في Supabase > SQL Editor
-- يضيف عمود role_icons لحفظ أيقونات الرتب المخصصة لكل مستخدم

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS role_icons JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS role_icons JSONB DEFAULT '{}';
-- مثال على البيانات المحفوظة:
-- { "owner": "https://..../my-trophy.gif", "admin": "https://..../star.png" }
