import Image from "next/image";

// Trader'a hitap eden, "canlı terminal" hissi veren yoğun bir kolaj — gerçek
// bir gece şehir fotoğrafı (Unsplash License, ücretsiz ticari kullanım) temel
// katman olarak kullanılıyor, üzerine kendi ürettiğimiz paneller/grafikler
// bindiriliyor. Ortadaki halka motifi soyut bir güvenlik-baskısı dokusu,
// belirli bir kişi/portre değil. Panellerdeki içerik örnek/dekoratiftir.
const PHOTO_URL =
  "https://images.unsplash.com/photo-1605702012553-e954fbde66eb?auto=format&fit=crop&w=1920&q=80";

const BARS = [
  58, 52, 44, 36, 30, 25, 22, 20, 19, 21, 25, 28, 24, 20, 17, 16, 18, 22, 27,
  32, 29, 25, 22, 21, 24, 30, 37, 43, 40, 36, 39, 45, 51, 56, 53, 58, 64, 69,
  66, 72, 77, 81, 78, 83, 88,
];

const LEADERBOARD = [
  { name: "A. Morgan", ret: "+8.2%", risk: "Low" },
  { name: "L. Rossi", ret: "+7.8%", risk: "Low" },
  { name: "S. Chen", ret: "+7.1%", risk: "Med" },
  { name: "M. Johnson", ret: "+6.9%", risk: "Med" },
  { name: "J. Lee", ret: "+6.5%", risk: "High" },
];

const ACTIVITY = [
  { who: "E. Williams", what: "USD/JPY", dir: "LONG", ago: "2m" },
  { who: "A. Morgan", what: "TSLA", dir: "BUY", ago: "5m" },
  { who: "L. Rossi", what: "BTC/USDT", dir: "LONG", ago: "7m" },
  { who: "S. Chen", what: "NASDAQ-100", dir: "BUY", ago: "11m" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.replace(".", "")[0])
    .join("")
    .toUpperCase();
}

export function HeroTerminal() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-bg-primary" />
      <Image
        src={PHOTO_URL}
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="object-cover object-[60%_30%] opacity-50 grayscale contrast-125"
      />

      {/* Top chart band */}
      <svg
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-[34vh] w-full opacity-70 grayscale"
      >
        <defs>
          <linearGradient id="terminal-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EDEAE2" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#EDEAE2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="hero-bars-pulse">
          {BARS.map((h, i) => {
            const bw = 1200 / BARS.length;
            const bh = (h / 100) * 220;
            return <rect key={i} x={i * bw + 1} y={220 - bh} width={bw - 2} height={bh} fill="url(#terminal-bar)" />;
          })}
        </g>
      </svg>

      {/* Abstract engraved security-pattern ring (NOT a portrait) */}
      <svg
        viewBox="0 0 600 600"
        className="hero-ring-spin absolute left-1/2 top-[30%] h-[52vh] w-[52vh] opacity-[0.14]"
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <circle
            key={i}
            cx="300"
            cy="300"
            r={40 + i * 18}
            fill="none"
            stroke="#EDEAE2"
            strokeWidth="0.6"
          />
        ))}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 360) / 36;
          return (
            <line
              key={i}
              x1="300"
              y1="300"
              x2={300 + 280 * Math.cos((angle * Math.PI) / 180)}
              y2={300 + 280 * Math.sin((angle * Math.PI) / 180)}
              stroke="#EDEAE2"
              strokeWidth="0.4"
            />
          );
        })}
      </svg>

      {/* Left panel: leaderboard */}
      <div className="absolute left-[3%] top-[40%] hidden w-[26%] max-w-[300px] rounded-[4px] border border-white/15 bg-black/50 p-4 opacity-70 backdrop-blur-sm sm:block">
        <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-signal-positive" />
          Top traders · monthly
        </p>
        <div className="flex flex-col gap-2.5">
          {LEADERBOARD.map((t) => (
            <div key={t.name} className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[9px] text-white/60">
                {initials(t.name)}
              </div>
              <span className="flex-1 truncate font-mono text-[11px] text-white/60">{t.name}</span>
              <span className="font-mono text-[11px] text-signal-positive/80">{t.ret}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: live activity feed */}
      <div className="absolute right-[3%] top-[44%] w-[30%] max-w-[340px] rounded-[4px] border border-white/15 bg-black/50 p-4 opacity-70 backdrop-blur-sm sm:right-[5%]">
        <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-signal-positive" />
          Live activity
        </p>
        <div className="flex flex-col gap-2.5">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="flex items-center justify-between border-b border-white/10 pb-2 font-mono text-[11px] text-white/55 last:border-0">
              <span className="truncate">{a.who}</span>
              <span className="text-white/35">{a.what}</span>
              <span className={a.dir === "LONG" || a.dir === "BUY" ? "text-signal-positive/80" : "text-signal-negative/80"}>
                {a.dir}
              </span>
              <span className="text-white/30">{a.ago}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grain */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay">
        <filter id="terminal-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#terminal-grain)" />
      </svg>

      {/* Vignette for legibility */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_40%,transparent_0%,rgba(14,17,22,0.9)_75%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-primary/50 to-bg-primary" />

      <span className="absolute bottom-3 right-4 z-10 text-right font-mono text-[10px] leading-relaxed text-white/20">
        Illustrative preview data
        <br />
        Photo: Dominik Hofbauer / Unsplash
      </span>
    </div>
  );
}
