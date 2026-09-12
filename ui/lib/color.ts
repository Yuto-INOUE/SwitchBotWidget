/** SwitchBot の色指定は "R:G:B"。入力欄の #rrggbb と相互変換する */

export function hexToRgbParameter(hex: string): string {
  const clean = hex.replace(/^#/, "");
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) || 0).join(":");
}

export function rgbParameterToHex(rgb: string): string {
  const parts = rgb.split(":").map((v) => Number(v));
  const channel = (i: number) => {
    const v = parts[i];
    const safe = Number.isFinite(v) ? Math.min(255, Math.max(0, Math.trunc(v!))) : 255;
    return safe.toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}
