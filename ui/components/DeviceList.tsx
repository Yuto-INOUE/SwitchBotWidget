import type { DeviceCommand } from "../lib/commands";
import { DEFAULT_AC, type AcState, type Device, type DeviceStatus } from "../lib/types";
import { DeviceCard } from "./DeviceCard";

type Props = {
  devices: readonly Device[];
  statuses: ReadonlyMap<string, DeviceStatus>;
  busy: ReadonlySet<string>;
  acStates: Record<string, AcState>;
  /** 選べるデバイス自体はあるのか（空表示の文言を変えるため） */
  hasUsableDevices: boolean;
  onRun: (device: Device, command: DeviceCommand) => void;
  onAcChange: (device: Device, next: AcState) => void;
  onOpenPicker: () => void;
};

export function DeviceList({
  devices,
  statuses,
  busy,
  acStates,
  hasUsableDevices,
  onRun,
  onAcChange,
  onOpenPicker,
}: Props) {
  if (devices.length === 0) {
    return (
      <div className="view">
        <div className="empty">
          <span>
            {hasUsableDevices
              ? "表示するデバイスが選ばれていません。"
              : "操作できるデバイスが見つかりませんでした。"}
          </span>
          <button type="button" className="btn primary" onClick={onOpenPicker}>
            デバイスを選ぶ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      {devices.map((device) => (
        <DeviceCard
          key={device.deviceId}
          device={device}
          status={statuses.get(device.deviceId)}
          ac={acStates[device.deviceId] ?? DEFAULT_AC}
          busy={busy.has(device.deviceId)}
          onRun={(command) => onRun(device, command)}
          onAcChange={(next) => onAcChange(device, next)}
        />
      ))}
    </div>
  );
}
