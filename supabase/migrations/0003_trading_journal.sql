-- Portfey: Trading Journal — kullanıcının kendi işlem geçmişini kaydettiği ve
-- performans analitiği aldığı çekirdek özellik. Dış piyasa verisi lisansı
-- gerektirmez (kullanıcı kendi verisini giriyor), bu yüzden freemium/RLS
-- modeli insider_trades'ten çok daha basit: herkes yalnızca kendi trade'lerini
-- görür/yazar, ücretsiz katman yalnızca toplam trade sayısını sınırlar.

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  quantity numeric(20, 6) not null check (quantity > 0),
  entry_price numeric(18, 6) not null check (entry_price > 0),
  exit_price numeric(18, 6) check (exit_price > 0),
  fees numeric(18, 6) not null default 0,
  entered_at timestamptz not null,
  exited_at timestamptz,
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trades enable row level security;

create policy "trades_select_own"
  on public.trades for select
  to authenticated
  using (auth.uid() = user_id);

-- Freemium: ücretsiz kullanıcılar en fazla 20 trade kaydedebilir. Sınır
-- değişirse src/lib/subscription.ts'teki FREE_TRADE_LIMIT ile birlikte güncelleyin.
create policy "trades_insert_own"
  on public.trades for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.subscription_status in ('trialing', 'active')
      )
      or (select count(*) from public.trades where trades.user_id = auth.uid()) < 20
    )
  );

create policy "trades_update_own"
  on public.trades for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trades_delete_own"
  on public.trades for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists trades_user_id_entered_at_idx
  on public.trades (user_id, entered_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at
  before update on public.trades
  for each row execute procedure public.set_updated_at();
