create table public.cv_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile) = 'object' and octet_length(profile::text) <= 65536),
  updated_at timestamptz not null default now()
);

alter table public.cv_profiles enable row level security;

revoke all on table public.cv_profiles from anon;
grant select, insert, update, delete on table public.cv_profiles to authenticated;

create or replace function public.has_second_factor() returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as entry
    where entry ->> 'method' in ('otp', 'magiclink')
  );
$$;

create policy "cv owner reads" on public.cv_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.has_second_factor()));

create policy "cv owner inserts" on public.cv_profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.has_second_factor()));

create policy "cv owner updates" on public.cv_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.has_second_factor()))
  with check ((select auth.uid()) = user_id and (select public.has_second_factor()));

create policy "cv owner deletes" on public.cv_profiles
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.has_second_factor()));
