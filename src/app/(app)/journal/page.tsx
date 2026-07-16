import { JournalClient } from "@/components/JournalClient";

export default function JournalPage() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-display text-2xl font-medium tracking-tight">Trade journal</h1>
        <p className="mt-1 text-sm text-text-muted">
          Log every trade — win, loss, or still open — and we&apos;ll turn it into performance
          analytics automatically.
        </p>
      </section>
      <JournalClient />
    </div>
  );
}
