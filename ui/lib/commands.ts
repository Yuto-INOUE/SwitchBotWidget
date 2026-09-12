import { hexToRgbParameter } from "./color";
import { AC_TEMPERATURE_RANGE } from "./labels";
import type { AcState } from "./types";

/** デバイスに送る 1 回分の指示。UI 側はこの形だけを扱う */
export type DeviceCommand = {
  command: string;
  parameter: string;
  commandType: "command" | "customize";
  /** 送信後にステータスバーへ出す文言 */
  label: string;
  /** 応答を待たずに画面へ反映してよい電源状態 */
  optimisticPower?: boolean;
  /** 送信後に状態を取り直すか。読み取れないデバイスでは false */
  refresh: boolean;
};

type Options = Partial<Omit<DeviceCommand, "command" | "label">>;

const make = (command: string, label: string, options: Options = {}): DeviceCommand => ({
  command,
  parameter: "default",
  commandType: "command",
  refresh: true,
  label,
  ...options,
});

export const Commands = {
  turnOn: () => make("turnOn", "ON", { optimisticPower: true }),
  turnOff: () => make("turnOff", "OFF", { optimisticPower: false }),
  press: () => make("press", "押しました", { refresh: false }),

  lock: () => make("lock", "施錠", { optimisticPower: true }),
  unlock: () => make("unlock", "解錠", { optimisticPower: false }),

  curtainOpen: () => make("turnOn", "開"),
  curtainClose: () => make("turnOff", "閉"),
  curtainPause: () => make("pause", "停止"),
  /** API は 0 が全開なので、UI の「開度」を反転して渡す */
  curtainPosition: (openPercent: number) =>
    make("setPosition", `開度 ${openPercent}%`, { parameter: `0,ff,${100 - openPercent}` }),

  brightness: (value: number) => make("setBrightness", `明るさ ${value}`, { parameter: String(value) }),
  colorTemperature: (kelvin: number) =>
    make("setColorTemperature", `${kelvin}K`, { parameter: String(kelvin) }),
  color: (hex: string) => make("setColor", "色を変更", { parameter: hexToRgbParameter(hex) }),

  /** 赤外線エアコンは温度・モード・風量・電源をまとめて送る */
  airConditioner: (state: AcState) =>
    make("setAll", state.power ? `${state.temperature}℃` : "OFF", {
      parameter: `${state.temperature},${state.mode},${state.fan},${state.power ? "on" : "off"}`,
      refresh: false,
    }),

  /** 赤外線リモコンのボタン。押しても状態は読み出せない */
  infrared: (command: string, label: string) => make(command, label, { refresh: false }),

  vacuum: (command: string, label: string) => make(command, label),
};

export const clampAcTemperature = (value: number): number =>
  Math.min(AC_TEMPERATURE_RANGE.max, Math.max(AC_TEMPERATURE_RANGE.min, value));
