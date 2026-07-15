import { NextResponse } from "next/server";
import { Paddle, EventName } from "@paddle/paddle-node-sdk";
import type { SubscriptionNotification } from "@paddle/paddle-node-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/types/database";

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

// Paddle webhook durumları bizim subscription_status sözlüğümüzle bire bir eşleşiyor.
function toDbStatus(status: string): SubscriptionStatus {
  if (
    status === "active" ||
    status === "canceled" ||
    status === "past_due" ||
    status === "paused" ||
    status === "trialing"
  ) {
    return status;
  }
  return "none";
}

async function syncSubscription(subscription: SubscriptionNotification) {
  // custom_data'daki user_id, checkout başlatılırken client tarafından geçirilir
  // (bkz. src/components/CheckoutButton.tsx) — Paddle müşterisini Supabase
  // kullanıcısına bu şekilde bağlıyoruz.
  const userId = (subscription.customData as { user_id?: string } | null)?.user_id;
  if (!userId) return { error: "Missing user_id in custom_data." };

  const trialEndsAt = subscription.items.find((i) => i.trialDates)?.trialDates?.endsAt ?? null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      subscription_status: toDbStatus(subscription.status),
      paddle_customer_id: subscription.customerId,
      paddle_subscription_id: subscription.id,
      trial_ends_at: trialEndsAt,
    })
    .eq("id", userId);

  return error ? { error: "Failed to update profile." } : { error: null };
}

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  const secret = process.env.PADDLE_WEBHOOK_SECRET!;

  let eventData;
  try {
    eventData = await paddle.webhooks.unmarshal(rawBody, secret, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (!eventData) {
    return NextResponse.json({ received: true });
  }

  let result: { error: string | null } | null = null;

  switch (eventData.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionTrialing:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionResumed:
    case EventName.SubscriptionCanceled:
      result = await syncSubscription(eventData.data);
      break;
    default:
      break;
  }

  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
