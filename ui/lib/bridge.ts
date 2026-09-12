import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AcState, Config, Device } from "./types";

/** トレイメニューから飛んでくる指示 */
export type TrayAction = "refresh" | "settings";

/**
 * Rust 側コマンドの入口。画面からはこの関数群だけを呼ぶ。
 * トークンは Rust 側に閉じているので、ここを通ることはない。
 */
export const api = {
  isConfigured: () => invoke<boolean>("is_configured"),
  saveCredentials: (token: string, secret: string) =>
    invoke<void>("save_credentials", { token, secret }),
  forgetCredentials: () => invoke<void>("forget_credentials"),

  listDevices: () => invoke<Device[]>("list_devices"),
  deviceStatus: (deviceId: string) => invoke<unknown>("device_status", { deviceId }),
  runCommand: (deviceId: string, command: string, parameter: string, commandType: string) =>
    invoke<unknown>("run_command", { deviceId, command, parameter, commandType }),

  getConfig: () => invoke<Config>("get_config"),
  setConfig: (config: Config) => invoke<Config>("set_config", { config }),
  rememberAc: (deviceId: string, ac: AcState) => invoke<Config>("remember_ac", { deviceId, ac }),

  hideWindow: () => invoke<void>("hide_window"),
  quitApp: () => invoke<void>("quit_app"),

  version: () => getVersion(),
  onTrayAction: (handler: (action: TrayAction) => void): Promise<UnlistenFn> =>
    listen<TrayAction>("widget://action", (event) => handler(event.payload)),
};

/** Rust 側は日本語の文字列でエラーを返すので、そのまま表示できる形に整える */
export const errorMessage = (error: unknown): string =>
  typeof error === "string" ? error : error instanceof Error ? error.message : String(error);
