-- Signal: insider/institutional/congress trade tracker — başlangıç şeması.
-- Supabase SQL Editor'de veya `supabase db push` ile çalıştırın.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: auth.users'ı genişletir. Abonelik durumu Paddle webhook'u ile
-- güncellenir; client tarafından doğrudan yazılamaz.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  subscription_status text not null default 'none'
    check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'paused', 'canceled')),
  paddle_customer_id text,
  paddle_subscription_id text,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Yazma işlemleri yalnızca service role (Paddle webhook route'u) üzerinden yapılır.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- watchlists: kullanıcının takip ettiği tickerlar.
-- ---------------------------------------------------------------------------
create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ticker text not null,
  created_at timestamptz not null default now(),
  unique (user_id, ticker)
);

alter table public.watchlists enable row level security;

create policy "watchlists_select_own"
  on public.watchlists for select
  to authenticated
  using (auth.uid() = user_id);

create policy "watchlists_insert_own"
  on public.watchlists for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "watchlists_delete_own"
  on public.watchlists for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- insider_trades: Form 4 (Faz 1), 13F ve Congress (Faz 2/3) için ortak tablo.
-- Yazma yalnızca service role (ingestion route/cron) ile yapılır.
-- ---------------------------------------------------------------------------
create table if not exists public.insider_trades (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  cik text,
  insider_name text not null,
  insider_role text,
  transaction_type text not null check (transaction_type in ('buy', 'sell', 'other')),
  shares numeric(20, 4),
  price numeric(18, 4),
  total_value numeric(20, 2),
  filing_date date not null,
  transaction_date date,
  source text not null default 'form4' check (source in ('form4', '13f', 'congress')),
  accession_number text not null,
  created_at timestamptz not null default now(),
  unique (source, accession_number, insider_name, transaction_date, shares)
);

alter table public.insider_trades enable row level security;

-- Yalnızca aktif/deneme aboneliği olan kullanıcılar veriyi görebilir —
-- ücretli ürünün çekirdek verisi bu yüzden RLS seviyesinde de korunuyor.
create policy "insider_trades_select_subscribers"
  on public.insider_trades for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.subscription_status in ('trialing', 'active')
    )
  );

create index if not exists insider_trades_ticker_filing_date_idx
  on public.insider_trades (ticker, filing_date desc);

-- ---------------------------------------------------------------------------
-- notifications: kullanıcıya gönderilen uyarı kayıtları (dedupe + denetim için).
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trade_id uuid not null references public.insider_trades (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'push')),
  sent_at timestamptz not null default now(),
  unique (user_id, trade_id, channel)
);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- Yazma yalnızca service role (bildirim gönderim job'ı) ile yapılır.
