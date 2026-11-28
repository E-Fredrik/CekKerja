create table public.premium_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  premium_until timestamptz not null,
  updated_at timestamptz not null default now()
);

create table public.premium_orders (
  order_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  snap_token text,
  payment_type text,
  midtrans_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index premium_orders_user_created_idx on public.premium_orders (user_id, created_at desc);

alter table public.premium_subscriptions enable row level security;
alter table public.premium_orders enable row level security;

revoke all on table public.premium_subscriptions from anon, authenticated;
revoke all on table public.premium_orders from anon, authenticated;

grant select on table public.premium_subscriptions to authenticated;
grant select on table public.premium_orders to authenticated;

create policy "subscription owner reads" on public.premium_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.has_second_factor()));

create policy "order owner reads" on public.premium_orders
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.has_second_factor()));
