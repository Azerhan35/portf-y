"use client";

import { useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

export function CheckoutButton({ email, userId }: { email: string; userId: string }) {
  const [loading, setLoading] = useState(false);
  const [paddle, setPaddle] = useState<Paddle | undefined>();

  async function handleClick() {
    setLoading(true);
    try {
      const instance =
        paddle ??
        (await initializePaddle({
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
          environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox" ? "sandbox" : "production",
        }));

      if (!instance) return;
      setPaddle(instance);

      instance.Checkout.open({
        items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID!, quantity: 1 }],
        customer: { email },
        // Webhook'un Paddle aboneliğini Supabase kullanıcısına eşlemesi için gerekli
        // (bkz. src/app/api/webhooks/paddle/route.ts).
        customData: { user_id: userId },
        settings: { theme: "dark", displayMode: "overlay" },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md bg-accent-gold px-5 py-2.5 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim disabled:opacity-40"
    >
      {loading ? "Loading..." : "Start 7-day free trial"}
    </button>
  );
}
