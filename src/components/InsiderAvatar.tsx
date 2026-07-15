// Gerçek yüz fotoğrafı yerine bilinçli olarak baş harfli avatar kullanıyoruz:
// SEC'teki isimlerin büyük çoğunluğu tanınmış olmayan yöneticiler/yönetim
// kurulu üyeleridir ve isimle fotoğraf eşleştirmenin güvenilir/lisanslı bir
// kaynağı yok — yanlış kişinin fotoğrafını gerçek bir isimle göstermek ciddi
// bir risktir. Bu yaklaşım her zaman doğru ve anında kullanılabilir.
const PALETTE = [
  "#B8934F", // gold
  "#3A7D5C", // emerald
  "#8C4A45", // terracotta
  "#5B7C99", // slate blue
  "#8A6D9F", // muted violet
  "#A87C4F", // amber brown
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function InsiderAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const color = PALETTE[hashString(name) % PALETTE.length];

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display font-medium text-bg-primary"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
