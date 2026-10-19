import type { ReactNode } from "react";

export type IconName =
  | "search" | "chevron" | "arrow" | "info" | "message" | "close" | "play" | "pause" | "layers"
  | "location" | "leaf" | "chart" | "calendar" | "warning" | "reset"
  // Añadidos para la página de inicio y el tema
  | "sun" | "moon" | "satellite" | "database" | "target" | "map" | "rain" | "thermometer" | "mountain"
  | "polygon" | "cpu" | "wheat" | "bank" | "coins" | "shield" | "scale" | "x-circle" | "check" | "down"
  | "sparkle" | "filter" | "grid" | "clock" | "neighbors" | "plus" | "equal" | "shuffle";

const paths: Record<IconName, ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: <><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  message: <><path d="M20 15a4 4 0 0 1-4 4H8l-5 3 1.6-4A7 7 0 0 1 3 13V9a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v6Z" /><path d="M8 10h8M8 14h5" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  pause: <path d="M9 5v14M15 5v14" />,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  leaf: <><path d="M5 21c2-8 7-13 15-17-1 9-6 15-13 15" /><path d="M5 21c3-5 7-8 12-11" /></>,
  chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-5 4 3 5-7" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  warning: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  reset: <><path d="M4 8V3m0 0h5M4 3l4 4" /><path d="M5 13a8 8 0 1 0 3-6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  satellite: <><path d="M13 7 9 3 5 7l4 4" /><path d="m17 11 4 4-4 4-4-4" /><path d="m8 12 4 4 6-6-4-4Z" /><path d="m16 8 3-3" /><path d="M9 21a6 6 0 0 0-6-6" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
  rain: <><path d="M7 15a4.5 4.5 0 1 1 1.2-8.8A6 6 0 0 1 19 8.5 3.5 3.5 0 0 1 18 15" /><path d="m8 19-1 2M12 18l-1 3M16 19l-1 2" /></>,
  thermometer: <path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0Z" />,
  mountain: <path d="m3 20 6-11 4 7 3-4 5 8H3Z" />,
  polygon: <path d="m4 7 8-4 8 5-2 10-9 3-5-7V7Z" />,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  wheat: <><path d="M12 22V8" /><path d="M12 8c-2-1-3-3-3-5 2 1 3 3 3 5Zm0 0c2-1 3-3 3-5-2 1-3 3-3 5Z" /><path d="M12 13c-2.5-.5-4-2.5-4-4.5 2.5.5 4 2.5 4 4.5Zm0 0c2.5-.5 4-2.5 4-4.5-2.5.5-4 2.5-4 4.5Z" /><path d="M12 18c-2.5-.5-4-2.5-4-4.5 2.5.5 4 2.5 4 4.5Zm0 0c2.5-.5 4-2.5 4-4.5-2.5.5-4 2.5-4 4.5Z" /></>,
  bank: <><path d="M12 3 3 8h18l-9-5Z" /><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.7-2.7-3-6-3" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  scale: <><path d="M12 3v18M7 21h10M5 7h14" /><path d="m5 7-3 7a3 3 0 0 0 6 0L5 7Zm14 0-3 7a3 3 0 0 0 6 0l-3-7Z" /></>,
  "x-circle": <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  down: <path d="m6 9 6 6 6-6" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
  filter: <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4Z" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  neighbors: <><circle cx="12" cy="12" r="2.5" /><circle cx="5" cy="6" r="1.8" /><circle cx="19" cy="6" r="1.8" /><circle cx="5" cy="18" r="1.8" /><circle cx="19" cy="18" r="1.8" /><path d="m6.5 7.3 3.6 3.2M17.5 7.3l-3.6 3.2M6.5 16.7l3.6-3.2M17.5 16.7l-3.6-3.2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  equal: <path d="M5 9h14M5 15h14" />,
  shuffle: <><path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4" /><path d="m18 4 3 3-3 3M18 14l3 3-3 3" /></>,
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
  );
}
