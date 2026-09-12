/** Rust 側 `switchbot::Device` と対応する */
export type Device = {
  deviceId: string;
  name: string;
  /** 実機なら deviceType、赤外線リモコンなら remoteType が入る */
  kind: string;
  hubDeviceId: string;
  infrared: boolean;
  cloudEnabled: boolean;
};

/** status API の body。デバイス種別ごとに中身が違うため素の辞書で受ける */
export type StatusBody = Record<string, unknown>;

export type DeviceStatus = {
  /** 電源が入っているか。読み取れないデバイスでは undefined */
  power?: boolean;
  body: StatusBody;
  /** 取得に失敗したときの文言 */
  error?: string;
};

export type AcState = {
  temperature: number;
  /** 1:自動 2:冷房 3:除湿 4:送風 5:暖房 */
  mode: number;
  /** 1:自動 2:弱 3:中 4:強 */
  fan: number;
  power: boolean;
};

/** Rust 側 `store::Config` と対応する */
export type Config = {
  windowX: number | null;
  windowY: number | null;
  windowW: number;
  windowH: number;
  alwaysOnTop: boolean;
  opacity: number;
  autoRefreshSec: number;
  /** ドラッグを終えたときにモニタの端へ吸着させるか */
  snapToEdges: boolean;
  /** 起動時に新しいバージョンが出ていないか確かめるか */
  autoCheckUpdates: boolean;
  order: string[];
  hidden: string[];
  acState: Record<string, AcState>;
  launchAtLogin: boolean;
};

export type View = "devices" | "picker" | "settings" | "setup";

export const DEFAULT_AC: AcState = { temperature: 26, mode: 2, fan: 1, power: false };
