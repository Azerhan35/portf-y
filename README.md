# Portfey

Real-time insider trading, institutional fund, and Congress trade alerts for serious traders.
Next.js (App Router) + Supabase. Public regulatory filings only — not investment advice.

Free to start (2 tickers, last 3 days of filings), $19/month for unlimited tickers, full
history, and instant email alerts. No trial period — the free tier is permanently usable, just
limited.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/migrations/0001_init.sql`. This creates `profiles`,
   `watchlists`, `insider_trades`, `notifications`, the freemium RLS policies (free accounts
   see filings from the last 3 days and up to 2 watchlist tickers; `subscription_status` of
   `trialing`/`active` lifts both limits — see `src/lib/subscription.ts` for the single source
   of truth on those numbers), and the auto-profile-on-signup trigger.

### 2. Paddle (billing)

1. In your Paddle account (the same account can run multiple products/businesses — no need for
   a separate account), create a Product "Portfey" + a recurring monthly price ($19/mo, no
   trial). Copy the price ID into `NEXT_PUBLIC_PADDLE_PRICE_ID`.
2. Generate a client-side token (Developer Tools > Authentication) for
   `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, and an API key for `PADDLE_API_KEY`.
3. Set `NEXT_PUBLIC_PADDLE_ENV` to `sandbox` or `production` depending on which keys you used.
4. Once deployed, add a webhook destination pointing at
   `https://<your-domain>/api/webhooks/paddle`, subscribed to `subscription.*` events. Copy its
   signing secret into `PADDLE_WEBHOOK_SECRET`. Note: Paddle webhook destinations are
   account-wide, not scoped per product — if the account also runs another product, that
   product's events may hit this same URL too. The handler already ignores anything without a
   recognized `custom_data.user_id`, so this is safe by default.

### 3. Other data sources

- **SEC EDGAR** requires a descriptive `User-Agent` on every request (`SEC_EDGAR_USER_AGENT`),
  e.g. `"Portfey contact@yourdomain.com"` — requests without one get blocked with 403/429.
  No API key needed otherwise; see `src/lib/sec/`.
- **Finnhub**: free-tier API key for live stock quotes (`FINNHUB_API_KEY`).
- **Resend**: API key + a verified sender for trade-alert emails (`RESEND_API_KEY`,
  `NOTIFICATION_FROM_EMAIL`) — paid-tier only.

### 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in the values above, plus a random `CRON_SECRET` (e.g. `openssl rand -hex 32`) used to
protect `/api/ingest/form4`.

### 5. Run it

```bash
npm install
npm run dev
```

## Architecture notes

- **Freemium gating**: unlike a trial-gated product, every authenticated user can reach
  `/dashboard`, `/watchlist`, and `/ticker/*` (`src/proxy.ts` only checks auth, not
  subscription). The limits live at the data layer instead: `insider_trades` RLS only exposes
  the last `FREE_HISTORY_DAYS` (3) to free accounts, and the `watchlists` insert policy caps
  free accounts at `FREE_TICKER_LIMIT` (2) — both enforced in Postgres, not just in the API
  route, so they hold even against a direct client call. `src/lib/subscription.ts` is the one
  place to change those numbers (update the SQL policies alongside it if you do).
- **SEC Form 4 ingestion** (`src/lib/sec/`): resolves ticker → CIK via SEC's official
  `company_tickers.json`, reads each company's `submissions` feed for recent Form 4 filings,
  and parses the underlying XML (`fast-xml-parser`) for non-derivative (open-market) buy/sell
  transactions. Derivative (options/RSU) transactions are intentionally out of scope for the
  MVP signal. Note: the `primaryDocument` field in the submissions feed points at an XSLT
  viewer path (e.g. `xslF345X06/form4.xml`) — the actual parseable XML lives at the accession
  root under the same filename, which is what `getRecentForm4Filings` constructs.
- **Ingestion triggers**: adding a ticker to a watchlist triggers an immediate ingest for that
  ticker (`/api/watchlist` POST); `vercel.json`'s cron hits `/api/ingest/form4` every 30
  minutes to catch new filings for all watched tickers.
- **Notifications**: new trades trigger an email (via Resend) only to *paid* users watching
  that ticker — instant alerts are the main upgrade incentive. `notifications` has a unique
  constraint on `(user_id, trade_id, channel)` so re-running ingestion never double-sends.
- **Paddle ↔ Supabase mapping**: checkout passes `customData: { user_id }`
  (`src/components/CheckoutButton.tsx`); the webhook reads it back off the subscription
  payload to know which `profiles` row to update.
- **Design system**: dark-only theme (no light/dark toggle — see `src/app/globals.css` for
  the gold/emerald/terracotta token palette), Fraunces for display type, Inter for body copy,
  JetBrains Mono for all numeric data. Mobile is a first-class target — nav, trade rows, and
  forms all have explicit mobile breakpoints, not just a squeezed desktop layout.

## Roadmap (post-MVP, per product spec)

- Phase 2: SEC Form 13F (quarterly institutional fund holdings)
- Phase 3: Congress trade disclosures (STOCK Act) — Senate/House don't offer a clean API, so
  this will likely mean building a scraper or integrating an existing open-source parser.
