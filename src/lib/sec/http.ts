import "server-only";

// SEC EDGAR, tanımlayıcı bir User-Agent olmadan istekleri 403/429 ile reddeder.
// Format: "ŞirketAdı iletişim@eposta.com" (bkz. .env.example / SEC_EDGAR_USER_AGENT).
export function secHeaders(): HeadersInit {
  return {
    "User-Agent": process.env.SEC_EDGAR_USER_AGENT || "Signal contact@example.com",
    Accept: "application/json, text/xml, */*",
  };
}

export async function secFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: secHeaders(), next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`sec_fetch_failed_${res.status}_${url}`);
  }
  return res;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
