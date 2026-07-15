-- Portfey: 7 günlük deneme yerine freemium modele geçiş.
-- 0001_init.sql'i daha önce (eski, deneme-tabanlı haliyle) çalıştırdıysanız
-- bu dosyayı SQL Editor'de çalıştırın — idempotent'tir, tekrar tekrar
-- çalıştırılabilir. Sıfırdan kuruyorsanız buna gerek yok, 0001 zaten güncel.

drop policy if exists "insider_trades_select_subscribers" on public.insider_trades;
drop policy if exists "insider_trades_select_freemium" on public.insider_trades;

-- Ücretsiz kullanıcılar yalnızca son 3 günün dosyalamalarını görür; aktif/deneme
-- aboneliği olanlar tüm geçmişi görür. Sınır değişirse src/lib/subscription.ts'teki
-- FREE_HISTORY_DAYS ile burayı birlikte güncelleyin.
create policy "insider_trades_select_freemium"
  on public.insider_trades for select
  to authenticated
  using (
    filing_date >= (current_date - interval '3 days')
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.subscription_status in ('trialing', 'active')
    )
  );

drop policy if exists "watchlists_insert_own" on public.watchlists;

-- Ücretsiz kullanıcılar en fazla 2 ticker ekleyebilir (uygulama katmanında da
-- kontrol edilir, ama asıl garantiyi burası verir). Sınır değişirse
-- src/lib/subscription.ts'teki FREE_TICKER_LIMIT ile birlikte güncelleyin.
create policy "watchlists_insert_own"
  on public.watchlists for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.subscription_status in ('trialing', 'active')
      )
      or (select count(*) from public.watchlists where watchlists.user_id = auth.uid()) < 2
    )
  );
