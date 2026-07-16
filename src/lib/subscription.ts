import type { SubscriptionStatus } from "@/types/database";

// Freemium sınırları: ücretsiz katman kısıtlı ama kullanılabilir durumda,
// tam erişim için $19/ay abonelik gerekir (deneme süresi yok).
export const FREE_TICKER_LIMIT = 2;
export const FREE_HISTORY_DAYS = 3;
export const FREE_TRADE_LIMIT = 20;

export function isPaidTier(status: SubscriptionStatus | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
