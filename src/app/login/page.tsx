import Link from "next/link";
import { signInWithPassword } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-medium tracking-tight">Signal</h1>
        <p className="mt-2 text-sm text-text-muted">Track the money before the crowd does.</p>
      </div>

      {params.message && (
        <p className="rounded-md border border-signal-positive/30 bg-signal-positive/10 px-3 py-2 text-sm text-signal-positive">
          {params.message}
        </p>
      )}
      {params.error && (
        <p className="rounded-md border border-signal-negative/30 bg-signal-negative/10 px-3 py-2 text-sm text-signal-negative">
          {params.error}
        </p>
      )}

      <form action={signInWithPassword} className="flex flex-col gap-3">
        <input type="hidden" name="redirect" value={params.redirect ?? "/dashboard"} />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-md border border-border-hairline bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded-md border border-border-hairline bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-accent-gold px-3 py-2 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim"
        >
          Sign in
        </button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-accent-gold underline">
          Start your trial
        </Link>
      </p>
    </div>
  );
}
