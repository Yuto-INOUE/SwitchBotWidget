import type { Device } from "./types";

/** カードに出すアイコンの種類 */
export type IconName =
  | "power"
  | "bulb"
  | "plug"
  | "bot"
  | "curtain"
  | "lock"
  | "meter"
  | "tv"
  | "ac"
  | "fan"
  | "speaker"
  | "vacuum"
  | "hub"
  | "humidifier"
  | "sensor"
  | "projector"
  | "water";

/**
 * そのデバイスに対してどんな操作を出すか。
 * SwitchBot の deviceType / remoteType は種類が多いので、操作の形でまとめ直す。
 */
export type ControlKind =
  /** 操作も状態取得もできない（ハブ本体など） */
  | "none"
  /** ON / OFF だけ */
  | "power"
  /** ON / OFF に加えて「押す」 */
  | "bot"
  /** ON / OFF と明るさ・色 */
  | "light"
  /** 開 / 停 / 閉 と開度 */
  | "curtain"
  /** 施錠 / 解錠 */
  | "lock"
  /** 読み取り専用（温湿度・センサー） */
  | "reading"
  /** ロボット掃除機 */
  | "vacuum"
  /** 赤外線エアコン */
  | "ac"
  /** 赤外線 TV / STB / スピーカー */
  | "media"
  /** 赤外線 照明 */
  | "irlight"
  /** 赤外線 扇風機 */
  | "irfan"
  /** その他の赤外線リモコン（ON / OFF のみ） */
  | "irpower";

export type DeviceProfile = {
  icon: IconName;
  kind: ControlKind;
  /** RGB を指定できるか */
  hasColor?: boolean;
  /** 色温度を指定できるか */
  hasColorTemp?: boolean;
};

/** deviceType / remoteType を比較しやすい形に整える */
export const normalizeKind = (kind: string): string =>
  String(kind ?? "").toLowerCase().replace(/^diy\s+/, "").trim();

const IR_MEDIA = ["tv", "iptv/streamer", "set top box", "dvd"];

/** デバイスを「どう操作できるか」に分類する */
export function profileOf(dev: Device): DeviceProfile {
  const k = normalizeKind(dev.kind);

  if (dev.infrared) {
    if (k.includes("air conditioner")) return { icon: "ac", kind: "ac" };
    if (IR_MEDIA.includes(k)) return { icon: "tv", kind: "media" };
    if (k === "speaker") return { icon: "speaker", kind: "media" };
    if (k === "light") return { icon: "bulb", kind: "irlight" };
    if (k === "fan") return { icon: "fan", kind: "irfan" };
    if (k === "projector") return { icon: "projector", kind: "irpower" };
    if (k === "water heater") return { icon: "water", kind: "irpower" };
    if (k === "air purifier") return { icon: "humidifier", kind: "irpower" };
    if (k === "vacuum cleaner") return { icon: "vacuum", kind: "irpower" };
    return { icon: "power", kind: "irpower" };
  }

  if (k === "bot") return { icon: "bot", kind: "bot" };
  if (k.includes("plug")) return { icon: "plug", kind: "power" };
  if (k.includes("relay switch")) return { icon: "power", kind: "power" };
  if (k.includes("color bulb")) return { icon: "bulb", kind: "light", hasColor: true, hasColorTemp: true };
  if (k.includes("strip light")) return { icon: "bulb", kind: "light", hasColor: true };
  if (k.includes("ceiling light")) return { icon: "bulb", kind: "light", hasColorTemp: true };
  if (k.includes("curtain") || k.includes("blind tilt")) return { icon: "curtain", kind: "curtain" };
  if (k.includes("lock")) return { icon: "lock", kind: "lock" };
  if (k.includes("robot vacuum")) return { icon: "vacuum", kind: "vacuum" };
  if (k.includes("humidifier")) return { icon: "humidifier", kind: "power" };
  if (k.includes("air purifier")) return { icon: "humidifier", kind: "power" };
  if (k.includes("circulator fan") || k.includes("smart fan")) return { icon: "fan", kind: "power" };
  if (k.includes("meter") || k.includes("iosensor") || k === "hub 2" || k === "hub 3") {
    return { icon: "meter", kind: "reading" };
  }
  if (k.includes("sensor") || k.includes("detector")) return { icon: "sensor", kind: "reading" };
  if (k.includes("hub")) return { icon: "hub", kind: "none" };

  // 知らない機種は ON / OFF だけ出しておく
  return { icon: "power", kind: "power" };
}

export const isControllable = (dev: Device): boolean => profileOf(dev).kind !== "none";

/** 状態を読み出せるのは実機だけ。赤外線リモコンは送るだけで読めない */
export const hasReadableStatus = (dev: Device): boolean => !dev.infrared && isControllable(dev);
