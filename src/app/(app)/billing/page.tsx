import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/CheckoutButton";

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

  const isSubscribed =
    profile?.subscription_status === "trialing" || profile?.subscription_status === "active";

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-3xl font-medium tracking-tight">
        {isSubscribed ? "You're subscribed" : "Unlock Signal"}
      </h1>

      {isSubscribed ? (
        <p className="text-text-muted">
          Your subscription is {profile?.subscription_status}. Head to your{" "}
          <a href="/dashboard" className="text-accent-gold underline">
            dashboard
          </a>{" "}
          to see live signals.
        </p>
      ) : (
        <>
          <p className="text-text-muted">
            Real-time insider trading alerts from SEC filings. $19/month after a 7-day free
            trial. Cancel anytime.
          </p>
          <CheckoutButton email={user.email ?? ""} userId={user.id} />
          <p className="text-xs text-text-muted">
            Signal surfaces public regulatory filings for informational purposes only. Nothing
            here is investment advice.
          </p>
        </>
      )}
    </div>
  );
}
