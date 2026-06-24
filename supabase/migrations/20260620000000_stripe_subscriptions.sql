-- Stripe subscriptions management tables

create table if not exists public.stripe_customers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  email           text,
  organization    text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  stripe_subscription_id    text unique,
  stripe_customer_id        text references public.stripe_customers(stripe_customer_id) on delete set null,
  user_id                   uuid references auth.users(id) on delete set null,
  offer_id                  text not null,
  offer_name                text not null,
  status                    text not null default 'pending',
  -- active | past_due | canceled | trialing | incomplete | pending
  amount                    integer not null,
  currency                  text not null default 'xof',
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at_period_end      boolean default false,
  canceled_at               timestamptz,
  stripe_price_id           text,
  stripe_payment_intent_id  text,
  client_email              text,
  client_name               text,
  client_phone              text,
  organization              text,
  metadata                  jsonb default '{}',
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- RLS
alter table public.stripe_customers enable row level security;
alter table public.subscriptions enable row level security;

-- Admins and managers can view all
create policy "admin_view_stripe_customers"
  on public.stripe_customers for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'manager')
    )
  );

create policy "admin_view_subscriptions"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'manager')
    )
  );

-- Users can see their own subscription
create policy "user_view_own_subscription"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- Service role can do everything (edge functions use service role)
create policy "service_role_all_customers"
  on public.stripe_customers for all
  using (auth.role() = 'service_role');

create policy "service_role_all_subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Indexes
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_customer on public.subscriptions(stripe_customer_id);
create index if not exists idx_stripe_customers_user on public.stripe_customers(user_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists set_stripe_customers_updated_at on public.stripe_customers;
create trigger set_stripe_customers_updated_at
  before update on public.stripe_customers
  for each row execute function public.set_updated_at();
