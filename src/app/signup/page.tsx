import Link from "next/link";
import { signUpWithPassword } from "@/app/login/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-medium tracking-tight">Join Signal</h1>
        <p className="mt-2 text-sm text-text-muted">
          7-day free trial, then $19/mo. Cancel anytime.
        </p>
      </div>

      {params.error && (
        <p className="rounded-md border border-signal-negative/30 bg-signal-negative/10 px-3 py-2 text-sm text-signal-negative">
          {params.error}
        </p>
      )}

      <form action={signUpWithPassword} className="flex flex-col gap-3">
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
          minLength={6}
          placeholder="Password"
          className="rounded-md border border-border-hairline bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-accent-gold px-3 py-2 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim"
        >
          Create account
        </button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent-gold underline">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-text-muted">
        Signal surfaces public regulatory filings for informational purposes only. Nothing here
        is investment advice.
      </p>
    </div>
  );
}
