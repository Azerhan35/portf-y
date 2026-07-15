import { Nav } from "@/components/Nav";
import { SignalStrip } from "@/components/SignalStrip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Nav />
      <SignalStrip />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
