"use client";

import { useState } from "react";
import {
  parseCsv,
  guessMapping,
  buildTradesFromRows,
  IMPORT_FIELDS,
  type ImportField,
} from "@/lib/csvImport";

const FIELD_LABELS: Record<ImportField, string> = {
  symbol: "Symbol",
  side: "Side (long/short)",
  quantity: "Quantity",
  entry_price: "Entry price",
  exit_price: "Exit price",
  fees: "Fees",
  entered_at: "Entered at",
  exited_at: "Exited at",
  tags: "Tags",
  notes: "Notes",
  ignore: "— Ignore —",
};

type Step = "upload" | "map" | "result";

export function CsvImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, ImportField>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; invalid: number } | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) {
      setError("Could not read this file — make sure it's a CSV with a header row.");
      return;
    }
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(guessMapping(parsed.headers));
    setError(null);
    setStep("map");
  }

  async function handleImport() {
    setSubmitting(true);
    setError(null);

    const built = buildTradesFromRows(rows, mapping);
    const valid = built.filter((r) => r.ok).map((r) => (r as { trade: Record<string, unknown> }).trade);
    const invalidCount = built.length - valid.length;

    try {
      const res = await fetch("/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades: valid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }
      setResult({ imported: data.imported, skipped: data.skipped, invalid: invalidCount });
      setStep("result");
      onImported();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-bg-surface p-5 sm:rounded-[6px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Import trades from CSV</h2>
          <button onClick={onClose} className="text-text-muted">
            ✕
          </button>
        </div>

        {step === "upload" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">
              Export your trades from your broker or spreadsheet as a CSV with a header row (symbol,
              side, quantity, entry price, exit price, dates). We&apos;ll help you map the columns
              next.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="rounded-[6px] border border-dashed border-border-hairline bg-bg-primary px-3 py-8 text-sm file:mr-3 file:rounded-[4px] file:border-0 file:bg-accent-gold file:px-3 file:py-1.5 file:text-bg-primary"
            />
            {error && <p className="text-sm text-signal-negative">{error}</p>}
          </div>
        )}

        {step === "map" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              Match each column from your file to a field. Columns set to &quot;Ignore&quot; are
              skipped.
            </p>
            <div className="overflow-x-auto rounded-[6px] border border-border-hairline">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border-hairline text-text-muted">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2">
                        <p className="mb-1 truncate font-mono">{h}</p>
                        <select
                          value={mapping[i] ?? "ignore"}
                          onChange={(e) =>
                            setMapping((prev) => ({ ...prev, [i]: e.target.value as ImportField }))
                          }
                          className="w-full rounded-[4px] border border-border-hairline bg-bg-primary px-1 py-1 text-xs"
                        >
                          {IMPORT_FIELDS.map((f) => (
                            <option key={f} value={f}>
                              {FIELD_LABELS[f]}
                            </option>
                          ))}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 4).map((row, i) => (
                    <tr key={i} className="border-b border-border-hairline last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="truncate px-3 py-2 font-mono text-text-muted">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-muted">{rows.length} rows found.</p>

            {error && <p className="text-sm text-signal-negative">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setStep("upload")}
                className="rounded-[6px] border border-border-hairline px-4 py-2 text-sm"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={submitting}
                className="flex-1 rounded-[6px] bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary disabled:opacity-40"
              >
                {submitting ? "Importing..." : `Import ${rows.length} trades`}
              </button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-2xl">✅</p>
            <p className="text-sm">
              Imported <span className="text-signal-positive">{result.imported}</span> trades.
              {result.invalid > 0 && (
                <>
                  {" "}
                  Skipped {result.invalid} row{result.invalid === 1 ? "" : "s"} with missing/invalid
                  data.
                </>
              )}
              {result.skipped > 0 && (
                <> {result.skipped} more were left out due to your free plan limit.</>
              )}
            </p>
            <button
              onClick={onClose}
              className="rounded-[6px] bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
