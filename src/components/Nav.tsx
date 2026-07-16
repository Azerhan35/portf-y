"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const links = [
  { href: "/dashboard", label: "Dashboard", matchPrefixes: ["/dashboard"] },
  { href: "/journal", label: "Journal", matchPrefixes: ["/journal"] },
  { href: "/insiders", label: "Insiders", matchPrefixes: ["/insiders", "/insider", "/ticker"] },
  { href: "/watchlist", label: "Watchlist", matchPrefixes: ["/watchlist"] },
  { href: "/billing", label: "Billing", matchPrefixes: ["/billing"] },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border-hairline bg-bg-primary">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <Link
          href="/dashboard"
          className="shrink-0 font-display text-base font-medium tracking-tight sm:text-lg"
        >
          Portfey
        </Link>
        <div className="flex items-center gap-0.5 overflow-x-auto text-xs sm:gap-1 sm:text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-[6px] px-2 py-1.5 whitespace-nowrap sm:px-3 ${
                link.matchPrefixes.some((p) => pathname.startsWith(p))
                  ? "bg-bg-surface-raised text-accent-gold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <form action={signOut} className="shrink-0">
            <button
              type="submit"
              className="rounded-[6px] px-2 py-1.5 whitespace-nowrap text-text-muted hover:text-text-primary sm:px-3"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
