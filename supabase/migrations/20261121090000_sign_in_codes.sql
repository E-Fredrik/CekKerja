create table public.sign_in_codes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index sign_in_codes_user_created_idx on public.sign_in_codes (user_id, created_at desc);

alter table public.sign_in_codes enable row level security;

revoke all on table public.sign_in_codes from anon, authenticated;
