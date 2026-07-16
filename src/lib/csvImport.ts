import Papa from "papaparse";

export type ImportField =
  | "symbol"
  | "side"
  | "quantity"
  | "entry_price"
  | "exit_price"
  | "fees"
  | "entered_at"
  | "exited_at"
  | "tags"
  | "notes"
  | "ignore";

export const IMPORT_FIELDS: ImportField[] = [
  "symbol",
  "side",
  "quantity",
  "entry_price",
  "exit_price",
  "fees",
  "entered_at",
  "exited_at",
  "tags",
  "notes",
  "ignore",
];

const ALIASES: Record<Exclude<ImportField, "ignore">, string[]> = {
  symbol: ["symbol", "ticker", "security", "instrument"],
  side: ["side", "action", "direction", "type"],
  quantity: ["quantity", "qty", "shares", "size", "amount"],
  entry_price: ["entry_price", "entryprice", "buy_price", "open_price", "price", "buy", "entry"],
  exit_price: ["exit_price", "exitprice", "sell_price", "close_price", "sell", "exit"],
  fees: ["fees", "fee", "commission", "commissions"],
  entered_at: ["entered_at", "open_date", "entry_date", "date", "opened", "open_time", "open"],
  exited_at: ["exited_at", "close_date", "exit_date", "closed", "close_time", "close"],
  tags: ["tags", "tag", "strategy", "setup"],
  notes: ["notes", "note", "comment", "comments"],
};

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const data = (result.data ?? []) as string[][];
  if (data.length === 0) return { headers: [], rows: [] };
  return { headers: data[0], rows: data.slice(1) };
}

// Başlık isimlerine bakarak en olası eşleşmeyi tahmin eder — kullanıcı
// önizlemede istediği sütunu değiştirebilir, bu sadece bir başlangıç noktası.
export function guessMapping(headers: string[]): Record<number, ImportField> {
  const mapping: Record<number, ImportField> = {};

  headers.forEach((header, i) => {
    const normalized = header.trim().toLowerCase().replace(/\s+/g, "_");
    for (const [field, aliases] of Object.entries(ALIASES) as [Exclude<ImportField, "ignore">, string[]][]) {
      if (aliases.includes(normalized)) {
        mapping[i] = field;
        return;
      }
    }
    mapping[i] = "ignore";
  });

  return mapping;
}

function normalizeSide(raw: string): "long" | "short" {
  const v = raw.trim().toLowerCase();
  if (v === "short" || v === "sell" || v === "sell short" || v === "s") return "short";
  return "long";
}

export type ImportRowResult =
  | { ok: true; trade: Record<string, unknown> }
  | { ok: false; row: number; error: string };

export function buildTradesFromRows(
  rows: string[][],
  mapping: Record<number, ImportField>
): ImportRowResult[] {
  return rows.map((row, i) => {
    const get = (field: ImportField): string => {
      const idx = Object.entries(mapping).find(([, f]) => f === field)?.[0];
      return idx != null ? (row[Number(idx)] ?? "").trim() : "";
    };

    const symbol = get("symbol").toUpperCase();
    const quantity = Number(get("quantity"));
    const entryPrice = Number(get("entry_price"));
    const exitRaw = get("exit_price");
    const enteredAtRaw = get("entered_at");

    if (!symbol) return { ok: false, row: i + 2, error: "Missing symbol" };
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, row: i + 2, error: "Invalid quantity" };
    }
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      return { ok: false, row: i + 2, error: "Invalid entry price" };
    }
    const enteredAt = enteredAtRaw ? new Date(enteredAtRaw) : null;
    if (!enteredAt || Number.isNaN(enteredAt.getTime())) {
      return { ok: false, row: i + 2, error: "Invalid entry date" };
    }

    const exitedAtRaw = get("exited_at");
    const exitedAt = exitedAtRaw ? new Date(exitedAtRaw) : null;

    return {
      ok: true,
      trade: {
        symbol,
        side: normalizeSide(get("side")),
        quantity,
        entryPrice,
        exitPrice: exitRaw ? Number(exitRaw) : null,
        fees: get("fees") ? Number(get("fees")) : 0,
        enteredAt: enteredAt.toISOString(),
        exitedAt: exitedAt && !Number.isNaN(exitedAt.getTime()) ? exitedAt.toISOString() : null,
        tags: get("tags")
          ? get("tags")
              .split(/[,;]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        notes: get("notes") || null,
      },
    };
  });
}
