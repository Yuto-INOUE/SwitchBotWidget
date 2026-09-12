import { normalizeKind } from "./profile";
import type { Device } from "./types";

/** SwitchBot が返す機種名のうち、日本語にしたほうが分かりやすいもの */
const KIND_LABEL: Readonly<Record<string, string>> = {
  bot: "ボット",
  plug: "プラグ",
  "plug mini (jp)": "プラグミニ",
  "plug mini (us)": "プラグミニ",
  "smart lock": "スマートロック",
  "smart lock pro": "スマートロック Pro",
  "smart lock lite": "スマートロック Lite",
  "smart lock ultra": "スマートロック Ultra",
  humidifier: "加湿器",
  "hub mini": "ハブミニ",
  "hub 2": "ハブ2",
  "hub 3": "ハブ3",
  "ceiling light": "シーリングライト",
  "ceiling light pro": "シーリングライト Pro",
  "blind tilt": "ブラインドポール",
  "circulator fan": "サーキュレーター",
  "battery circulator fan": "サーキュレーター",
  "robot vacuum cleaner s1": "ロボット掃除機",
  "robot vacuum cleaner s1 plus": "ロボット掃除機",
  "water leak detector": "水漏れセンサー",
  "iptv/streamer": "ストリーミング端末",
  dvd: "DVD プレーヤー",
  curtain: "カーテン",
  curtain3: "カーテン3",
  meter: "温湿度計",
  meterplus: "温湿度計プラス",
  meterpro: "温湿度計Pro",
  woiosensor: "屋内外温湿度計",
  "color bulb": "スマート電球",
  "strip light": "テープライト",
  "motion sensor": "人感センサー",
  "contact sensor": "開閉センサー",
  "air conditioner": "エアコン",
  light: "照明",
  tv: "テレビ",
  fan: "扇風機",
  speaker: "スピーカー",
  projector: "プロジェクター",
  "set top box": "セットトップボックス",
  "water heater": "給湯器",
  "air purifier": "空気清浄機",
  "vacuum cleaner": "掃除機",
  others: "その他",
};

/** 「スマート電球」「エアコン（赤外線）」のような表示名 */
export function kindLabel(dev: Device): string {
  const label = KIND_LABEL[normalizeKind(dev.kind)] ?? dev.kind;
  return dev.infrared ? `${label}（赤外線）` : label;
}

export const AC_MODES: ReadonlyArray<readonly [number, string]> = [
  [1, "自動"],
  [2, "冷房"],
  [3, "除湿"],
  [4, "送風"],
  [5, "暖房"],
];

export const AC_FANS: ReadonlyArray<readonly [number, string]> = [
  [1, "自動"],
  [2, "弱"],
  [3, "中"],
  [4, "強"],
];

export const acModeLabel = (mode: number): string =>
  AC_MODES.find(([value]) => value === mode)?.[1] ?? "";

export const AC_TEMPERATURE_RANGE = { min: 16, max: 30 } as const;

export const REFRESH_OPTIONS: ReadonlyArray<readonly [number, string]> = [
  [0, "しない"],
  [60, "1 分ごと"],
  [300, "5 分ごと"],
  [900, "15 分ごと"],
  [3600, "1 時間ごと"],
];
