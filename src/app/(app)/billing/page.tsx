import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/CheckoutButton";
import { isPaidTier, FREE_TICKER_LIMIT, FREE_HISTORY_DAYS } from "@/lib/subscription";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const isPaid = isPaidTier(profile?.subscription_status);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-3xl font-medium tracking-tight">
        {isPaid ? "You're on Portfey Unlimited" : "Upgrade to Portfey Unlimited"}
      </h1>

      {isPaid ? (
        <p className="text-text-muted">
          Your subscription is {profile?.subscription_status}. Head to your{" "}
          <a href="/dashboard" className="text-accent-gold underline">
            dashboard
          </a>{" "}
          for unlimited tickers, full history, and instant email alerts.
        </p>
      ) : (
        <>
          <p className="text-text-muted">
            You&apos;re on the free plan: up to {FREE_TICKER_LIMIT} tickers and the last{" "}
            {FREE_HISTORY_DAYS} days of filings, no email alerts. Upgrade for $19/month to unlock
            unlimited tickers, full trade history, and instant alerts the moment a filing hits
            SEC EDGAR.
          </p>
          <CheckoutButton email={user.email ?? ""} userId={user.id} />
          <p className="text-xs text-text-muted">
            Portfey surfaces public regulatory filings for informational purposes only. Nothing
            here is investment advice.
          </p>
        </>
      )}
    </div>
  );
}
