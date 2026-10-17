import type { ReactNode } from "react";

export type IconName =
  | "search" | "chevron" | "arrow" | "info" | "message" | "close" | "play" | "pause" | "layers"
  | "location" | "leaf" | "chart" | "calendar" | "warning" | "reset";

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
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
  );
}
