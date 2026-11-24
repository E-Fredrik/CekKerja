create table public.check_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  entry jsonb not null check (
    jsonb_typeof(entry) = 'object'
    and entry ? 'kind'
    and coalesce(entry ->> 'kind' in ('ad', 'contract', 'interview'), false)
    and octet_length(entry::text) <= 8192
  )
);

create index check_history_owner_date_idx on public.check_history (user_id, created_at desc, id desc);

alter table public.check_history enable row level security;

revoke all on table public.check_history from anon, authenticated;
grant select on table public.check_history to authenticated;
grant insert (user_id, entry) on table public.check_history to authenticated;

create policy "history owner reads" on public.check_history
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.has_second_factor()));

create policy "history owner inserts" on public.check_history
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.has_second_factor()));
