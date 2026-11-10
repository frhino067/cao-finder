create table public.cao_study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  studied_on date not null check (studied_on between date '2000-01-01' and date '2100-12-31'),
  duration_minutes smallint not null check (duration_minutes between 1 and 1440),
  subject text not null check (subject = btrim(subject) and char_length(subject) between 1 and 60),
  difficulty smallint not null check (difficulty between 1 and 5),
  topic text not null default '' check (char_length(topic) <= 240),
  created_at timestamptz not null default now()
);

create index cao_study_sessions_owner_date_idx
  on public.cao_study_sessions (user_id, studied_on desc, id desc);

alter table public.cao_study_sessions enable row level security;
revoke all on public.cao_study_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.cao_study_sessions to authenticated;

create policy "Manage own study sessions"
  on public.cao_study_sessions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
