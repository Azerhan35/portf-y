"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/billing", label: "Billing" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border-hairline bg-bg-primary">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-display text-lg font-medium tracking-tight">
          Signal
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-[6px] px-3 py-1.5 whitespace-nowrap ${
                pathname === link.href
                  ? "bg-bg-surface-raised text-accent-gold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <form action={signOut}>
            <button type="submit" className="rounded-[6px] px-3 py-1.5 text-text-muted hover:text-text-primary">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
