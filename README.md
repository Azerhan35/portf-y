# Signal

Real-time insider trading, institutional fund, and Congress trade alerts for serious traders.
Next.js (App Router) + Supabase. Public regulatory filings only — not investment advice.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/migrations/0001_init.sql`. This creates `profiles`,
   `watchlists`, `insider_trades`, `notifications`, RLS policies (including the rule that
   `insider_trades` is only readable by users with `subscription_status` in
   `trialing`/`active`), and the auto-profile-on-signup trigger.

### 2. Paddle (billing)

1. Create a [Paddle](https://paddle.com) account (sandbox for development).
2. Create a product + a recurring monthly price (~$19/mo) with a 7-day free trial. Copy the
   price ID into `NEXT_PUBLIC_PADDLE_PRICE_ID`.
3. Generate a client-side token (Developer Tools > Authentication) for
   `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, and an API key for `PADDLE_API_KEY`.
4. Add a webhook destination pointing at `https://<your-domain>/api/webhooks/paddle`,
   subscribed to `subscription.*` events. Copy its signing secret into
   `PADDLE_WEBHOOK_SECRET`.

### 3. Other data sources

- **SEC EDGAR** requires a descriptive `User-Agent` on every request (`SEC_EDGAR_USER_AGENT`),
  e.g. `"Signal contact@yourdomain.com"` — requests without one get blocked with 403/429.
  No API key needed otherwise; see `src/lib/sec/`.
- **Finnhub**: free-tier API key for live stock quotes (`FINNHUB_API_KEY`).
- **Resend**: API key + a verified sender for trade-alert emails (`RESEND_API_KEY`,
  `NOTIFICATION_FROM_EMAIL`).

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
- **Notifications**: new trades trigger an email (via Resend) to every subscribed user
  watching that ticker; `notifications` has a unique constraint on
  `(user_id, trade_id, channel)` so re-running ingestion never double-sends.
- **Paddle ↔ Supabase mapping**: checkout passes `customData: { user_id }`
  (`src/components/CheckoutButton.tsx`); the webhook reads it back off the subscription
  payload to know which `profiles` row to update.
- **Access gating**: `/dashboard`, `/watchlist`, and `/ticker/*` require an active or trialing
  subscription (checked in `src/proxy.ts`), and `insider_trades` is also gated at the RLS
  level — so even a direct API call from a non-subscriber returns nothing.
- **Design system**: dark-only theme (no light/dark toggle — see `src/app/globals.css` for
  the gold/emerald/terracotta token palette), Fraunces for display type, Inter for body copy,
  JetBrains Mono for all numeric data.

## Roadmap (post-MVP, per product spec)

- Phase 2: SEC Form 13F (quarterly institutional fund holdings)
- Phase 3: Congress trade disclosures (STOCK Act) — Senate/House don't offer a clean API, so
  this will likely mean building a scraper or integrating an existing open-source parser.
