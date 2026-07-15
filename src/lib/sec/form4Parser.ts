import "server-only";
import { XMLParser } from "fast-xml-parser";
import { secFetch } from "./http";
import type { TransactionType } from "@/types/database";
import type { Form4Filing } from "./submissions";

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (tagName) =>
    ["reportingOwner", "nonDerivativeTransaction"].includes(tagName),
});

export type ParsedTrade = {
  ticker: string;
  cik: string;
  insiderName: string;
  insiderRole: string | null;
  transactionType: TransactionType;
  shares: number | null;
  price: number | null;
  totalValue: number | null;
  transactionDate: string | null;
  filingDate: string;
  source: "form4";
  accessionNumber: string;
};

function unwrap(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === "object" && "value" in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>).value);
  }
  return String(node);
}

function toCode(code: string | null): TransactionType {
  if (code === "P") return "buy";
  if (code === "S") return "sell";
  return "other";
}

// SEC şemaları arasında bu bayraklar hem "1"/"0" hem "true"/"false" olarak görülebiliyor.
function isTruthyFlag(value: string | null): boolean {
  return value === "1" || value === "true";
}

function describeRole(relationship: Record<string, unknown> | undefined): string | null {
  if (!relationship) return null;
  const parts: string[] = [];
  if (relationship.officerTitle) parts.push(unwrap(relationship.officerTitle) ?? "Officer");
  if (isTruthyFlag(unwrap(relationship.isDirector))) parts.push("Director");
  if (isTruthyFlag(unwrap(relationship.isTenPercentOwner))) parts.push("10% Owner");
  return parts.length > 0 ? parts.join(", ") : null;
}

// Bir Form 4 dosyalamasını indirir ve içindeki nakit (non-derivative) alım/satım
// işlemlerini normalize eder. Türev (opsiyon/RSU) işlemleri MVP kapsamı dışıdır —
// kullanıcıların asıl önemsediği "açık piyasada hisse aldı/sattı" sinyali budur.
export async function parseForm4(filing: Form4Filing): Promise<ParsedTrade[]> {
  const res = await secFetch(filing.documentUrl);
  const xml = await res.text();
  const doc = parser.parse(xml)?.ownershipDocument;
  if (!doc) return [];

  const ticker: string = unwrap(doc.issuer?.issuerTradingSymbol) ?? "";
  const owners = Array.isArray(doc.reportingOwner) ? doc.reportingOwner : [doc.reportingOwner];

  const insiderName = unwrap(owners[0]?.reportingOwnerId?.rptOwnerName) ?? "Unknown";
  const insiderRole = describeRole(owners[0]?.reportingOwnerRelationship);
  const cik = unwrap(owners[0]?.reportingOwnerId?.rptOwnerCik) ?? filing.cikNumeric;

  const rawTransactions = doc.nonDerivativeTable?.nonDerivativeTransaction;
  if (!rawTransactions) return [];

  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [rawTransactions];

  return transactions.map((tx: Record<string, unknown>, index: number): ParsedTrade => {
    const amounts = tx.transactionAmounts as Record<string, unknown> | undefined;
    const coding = tx.transactionCoding as Record<string, unknown> | undefined;

    const shares = amounts?.transactionShares ? Number(unwrap(amounts.transactionShares)) : null;
    const price = amounts?.transactionPricePerShare
      ? Number(unwrap(amounts.transactionPricePerShare))
      : null;

    return {
      ticker,
      cik,
      insiderName,
      insiderRole,
      transactionType: toCode(unwrap(coding?.transactionCode)),
      shares,
      price,
      totalValue: shares != null && price != null ? Number((shares * price).toFixed(2)) : null,
      transactionDate: unwrap(tx.transactionDate),
      filingDate: filing.filingDate,
      source: "form4",
      // Aynı dosyalamada birden fazla işlem satırı olabilir; benzersizliği
      // korumak için index'i accession number'a ekliyoruz.
      accessionNumber: `${filing.accessionNumber}#${index}`,
    };
  });
}
