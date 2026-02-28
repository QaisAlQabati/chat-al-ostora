-- =====================================================
-- جدول راديو الغرفة — شغّله في Supabase SQL Editor
-- =====================================================
create table if not exists public.radio_folders (
  id          text primary key,
  room_id     uuid not null references public.chat_rooms(id) on delete cascade,
  name        text not null,
  songs       jsonb not null default '[]',
  created_at  timestamptz default now()
);

-- صلاحيات RLS
alter table public.radio_folders enable row level security;

-- أي شخص يقرأ
create policy "radio_read" on public.radio_folders
  for select using (true);

-- فقط المالك يكتب (تتحقق من الكود)
create policy "radio_write" on public.radio_folders
  for all using (true);
