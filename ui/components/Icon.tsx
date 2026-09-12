import type { ReactElement } from "react";
import type { IconName } from "../lib/profile";

/** デバイス種別のアイコンと、画面まわりの記号 */
export type GlyphName =
  | IconName
  | "logo"
  | "refresh"
  | "list"
  | "pin"
  | "gear"
  | "close"
  | "chevron"
  | "check";

const GLYPHS: Record<GlyphName, ReactElement> = {
  power: (
    <>
      <path d="M12 3v8" />
      <path d="M6.8 6.8a7.4 7.4 0 1 0 10.4 0" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.5 18h5" />
      <path d="M10.5 21h3" />
      <path d="M12 3a6 6 0 0 0-3.4 10.9c.5.4.8.9.9 1.6h5c.1-.7.4-1.2.9-1.6A6 6 0 0 0 12 3z" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5" />
      <path d="M15 3v5" />
      <path d="M6.5 8h11v2.5a5.5 5.5 0 0 1-11 0V8z" />
      <path d="M12 16v5" />
    </>
  ),
  bot: (
    <>
      <rect x="4" y="6.5" width="16" height="11" rx="3" />
      <circle cx="9.5" cy="12" r="1.1" />
      <circle cx="14.5" cy="12" r="1.1" />
    </>
  ),
  curtain: (
    <>
      <path d="M3 4h18" />
      <path d="M6.5 4v16c3 0 4.2-3 4.2-8s-1.2-8-4.2-8z" />
      <path d="M17.5 4v16c-3 0-4.2-3-4.2-8s1.2-8 4.2-8z" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  meter: <path d="M14 14.6V5.5a2 2 0 1 0-4 0v9.1a4 4 0 1 0 4 0z" />,
  tv: (
    <>
      <rect x="3" y="6.5" width="18" height="12" rx="2" />
      <path d="M8.5 3L12 6l3.5-3" />
    </>
  ),
  ac: (
    <>
      <rect x="3" y="5" width="18" height="7" rx="2" />
      <path d="M6 8.5h6" />
      <path d="M7.5 16c0 1.4 1 1.9 1 3.2" />
      <path d="M12 16c0 1.4 1 1.9 1 3.2" />
      <path d="M16.5 16c0 1.4 1 1.9 1 3.2" />
    </>
  ),
  fan: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="1.8" />
      <path d="M12 10.2V5" />
      <path d="M13.6 12.9l4.5 2.6" />
      <path d="M10.4 12.9L5.9 15.5" />
    </>
  ),
  speaker: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <circle cx="12" cy="15" r="3" />
      <circle cx="12" cy="7" r="1" />
    </>
  ),
  vacuum: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v3" />
    </>
  ),
  hub: (
    <>
      <rect x="3.5" y="7.5" width="17" height="9" rx="2" />
      <path d="M7 12h.01" />
      <path d="M10.5 12H17" />
    </>
  ),
  humidifier: <path d="M12 3.5s5 5.6 5 9.2a5 5 0 0 1-10 0C7 9.1 12 3.5 12 3.5z" />,
  sensor: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4" />
      <path d="M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path d="M4.8 4.8a10 10 0 0 0 0 14.4" />
      <path d="M19.2 4.8a10 10 0 0 1 0 14.4" />
    </>
  ),
  projector: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <circle cx="9" cy="12" r="2.5" />
      <path d="M15 10h2.5" />
    </>
  ),
  water: <path d="M12 3.5s5.5 6.1 5.5 9.8a5.5 5.5 0 0 1-11 0C6.5 9.6 12 3.5 12 3.5z" />,

  logo: (
    <>
      <path d="M12 3v8" />
      <path d="M6.8 6.8a7.4 7.4 0 1 0 10.4 0" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11A8 8 0 0 0 6.3 6.3L3 9" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L21 15" />
      <path d="M3 4v5h5M21 20v-5h-5" />
    </>
  ),
  list: (
    <>
      <path d="M4 7h9M4 12h9M4 17h6" />
      <path d="M16 16.5l2 2 4-4.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12.5l5 5 9-10" />,
};

type Props = {
  name: GlyphName;
  strokeWidth?: number;
};

export function Icon({ name, strokeWidth = 1.8 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[name]}
    </svg>
  );
}
