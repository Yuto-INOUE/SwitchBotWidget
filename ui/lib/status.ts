import { rgbParameterToHex } from "./color";
import { acModeLabel, kindLabel } from "./labels";
import type { DeviceProfile } from "./profile";
import type { AcState, Device, DeviceStatus, StatusBody } from "./types";

const numberOf = (body: StatusBody, key: string): number | undefined => {
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const stringOf = (body: StatusBody, key: string): string | undefined => {
  const value = body[key];
  return typeof value === "string" ? value : undefined;
};

/** status API の body から、画面で使う形を取り出す */
export function parseStatus(body: unknown): DeviceStatus {
  const parsed: StatusBody = body !== null && typeof body === "object" ? (body as StatusBody) : {};
  const status: DeviceStatus = { body: parsed };

  const power = stringOf(parsed, "power") ?? stringOf(parsed, "powerState");
  if (power) status.power = power.toLowerCase() === "on";

  // 鍵は「施錠されている」を on とみなして色を付ける
  const lock = stringOf(parsed, "lockState");
  if (lock) status.power = lock.toLowerCase() !== "unlocked";

  return status;
}

export type Reading = { value: string; unit?: string };

/** 温湿度計やセンサーの、カード右側に大きく出す値 */
export function readingsOf(status: DeviceStatus | undefined): Reading[] {
  const body = status?.body ?? {};

  const temperature = numberOf(body, "temperature");
  const humidity = numberOf(body, "humidity");
  const readings: Reading[] = [];
  if (temperature !== undefined) readings.push({ value: String(temperature), unit: "℃" });
  if (humidity !== undefined) readings.push({ value: String(humidity), unit: "%" });
  if (readings.length > 0) return readings;

  const moved = body["moveDetected"];
  if (typeof moved === "boolean") return [{ value: moved ? "検知" : "静止" }];

  const openState = stringOf(body, "openState");
  if (openState) return [{ value: openState === "open" ? "開" : "閉" }];

  return [{ value: "—" }];
}

/** カードの 2 行目に出す補足。状態が取れていなければ機種名を返す */
export function describeDevice(
  device: Device,
  profile: DeviceProfile,
  status: DeviceStatus | undefined,
  ac: AcState,
): string {
  if (status?.error) return status.error;

  const body = status?.body ?? {};
  const bits: string[] = [];

  if (profile.kind !== "reading") {
    const temperature = numberOf(body, "temperature");
    const humidity = numberOf(body, "humidity");
    if (temperature !== undefined) bits.push(`${temperature}℃`);
    if (humidity !== undefined) bits.push(`${humidity}%`);
  }

  if (profile.kind === "light") {
    const brightness = numberOf(body, "brightness");
    if (brightness !== undefined) bits.push(`明るさ ${brightness}`);
  }

  if (profile.kind === "curtain") {
    const position = numberOf(body, "slidePosition");
    if (position !== undefined) bits.push(`開度 ${100 - position}%`);
  }

  if (profile.kind === "ac") {
    const summary = `${acModeLabel(ac.mode)} ${ac.temperature}℃`;
    bits.push(ac.power ? summary : `オフ · ${summary}`);
  }

  const battery = numberOf(body, "battery");
  if (battery !== undefined && battery <= 30) bits.push(`電池 ${battery}%`);
  if (stringOf(body, "onlineStatus") === "offline") bits.push("オフライン");
  if (!device.cloudEnabled) bits.push("クラウド連携が無効");

  return bits.length > 0 ? bits.join(" · ") : kindLabel(device);
}

// ---- 展開パネルの初期値。状態が取れていなければ無難な値を返す ----

export const brightnessOf = (status: DeviceStatus | undefined): number =>
  numberOf(status?.body ?? {}, "brightness") ?? 50;

export const colorTemperatureOf = (status: DeviceStatus | undefined): number =>
  numberOf(status?.body ?? {}, "colorTemperature") ?? 4000;

export const colorHexOf = (status: DeviceStatus | undefined): string =>
  rgbParameterToHex(stringOf(status?.body ?? {}, "color") ?? "255:255:255");

/** UI 上の「開度」。API の slidePosition は 0 が全開なので反転する */
export const openPercentOf = (status: DeviceStatus | undefined): number => {
  const position = numberOf(status?.body ?? {}, "slidePosition");
  return position === undefined ? 50 : 100 - position;
};
