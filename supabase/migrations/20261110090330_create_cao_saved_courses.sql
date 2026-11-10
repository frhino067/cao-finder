create table public.cao_saved_courses (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_code text not null check (course_code ~ '^[A-Z0-9]{3,12}$'),
  primary key (user_id, course_code)
);

alter table public.cao_saved_courses enable row level security;
revoke all on public.cao_saved_courses from public, anon, authenticated;
grant select, insert, delete on public.cao_saved_courses to authenticated;

create policy "Read own saved courses"
  on public.cao_saved_courses for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Add own saved courses"
  on public.cao_saved_courses for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Remove own saved courses"
  on public.cao_saved_courses for delete to authenticated
  using ((select auth.uid()) = user_id);
