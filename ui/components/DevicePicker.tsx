import { kindLabel } from "../lib/labels";
import { sortByConfig, usableDevices, visibleDevices } from "../lib/ordering";
import { profileOf } from "../lib/profile";
import type { Config, Device } from "../lib/types";
import { Icon } from "./Icon";

type Props = {
  devices: readonly Device[];
  config: Config;
  onToggle: (deviceId: string) => void;
  onMove: (deviceId: string, direction: "up" | "down") => void;
  onDone: () => void;
};

type RowProps = {
  device: Device;
  checked: boolean;
  onToggle: () => void;
  onMove?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
};

function PickRow({ device, checked, onToggle, onMove, canMoveUp, canMoveDown }: RowProps) {
  return (
    <div className={`pick${checked ? " on" : ""}`}>
      {/* 行のどこを押しても表示 / 非表示が切り替わる */}
      <button
        type="button"
        className="pick-main"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
      >
        <span className="pick-check">{checked && <Icon name="check" strokeWidth={3.2} />}</span>
        <span className="pick-icon">
          <Icon name={profileOf(device).icon} />
        </span>
        <span className="pick-label">
          <span className="pick-name">{device.name}</span>
          <span className="pick-kind">{kindLabel(device)}</span>
        </span>
      </button>

      {onMove && (
        <>
          <button
            type="button"
            className="mini"
            title="上へ"
            aria-label="上へ"
            disabled={!canMoveUp}
            onClick={() => onMove("up")}
          >
            ▲
          </button>
          <button
            type="button"
            className="mini"
            title="下へ"
            aria-label="下へ"
            disabled={!canMoveDown}
            onClick={() => onMove("down")}
          >
            ▼
          </button>
        </>
      )}
    </div>
  );
}

export function DevicePicker({ devices, config, onToggle, onMove, onDone }: Props) {
  const usable = usableDevices(devices, config.order);
  const shown = visibleDevices(devices, config);
  const hidden = usable.filter((device) => config.hidden.includes(device.deviceId));
  // ハブ本体のように、ウィジェットからは何もできない機器
  const locked = sortByConfig(devices, config.order).filter((d) => profileOf(d).kind === "none");

  return (
    <div className="view panel">
      <p className="hint">
        {usable.length > 0
          ? `${usable.length} 台のうち ${shown.length} 台をメイン画面に表示します。`
          : "操作できるデバイスが見つかりませんでした。"}
      </p>

      <div className="pick-group">
        {shown.length > 0 ? (
          <>
            <h3>表示中</h3>
            {shown.map((device, index) => (
              <PickRow
                key={device.deviceId}
                device={device}
                checked
                onToggle={() => onToggle(device.deviceId)}
                onMove={(direction) => onMove(device.deviceId, direction)}
                canMoveUp={index > 0}
                canMoveDown={index < shown.length - 1}
              />
            ))}
          </>
        ) : (
          <p className="hint">下の一覧から、PC から操作したいデバイスを選んでください。</p>
        )}
      </div>

      <div className="pick-group">
        {hidden.length > 0 && (
          <>
            <h3>非表示</h3>
            {hidden.map((device) => (
              <PickRow
                key={device.deviceId}
                device={device}
                checked={false}
                onToggle={() => onToggle(device.deviceId)}
              />
            ))}
          </>
        )}

        {locked.length > 0 && (
          <>
            <h3>操作に対応していない機器</h3>
            {locked.map((device) => (
              <div className="pick locked" key={device.deviceId}>
                <span className="pick-main">
                  <span className="pick-check" />
                  <span className="pick-icon">
                    <Icon name={profileOf(device).icon} />
                  </span>
                  <span className="pick-label">
                    <span className="pick-name">{device.name}</span>
                    <span className="pick-kind">{kindLabel(device)}</span>
                  </span>
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="picker-actions">
        <button type="button" className="btn primary" onClick={onDone}>
          完了
        </button>
      </div>
    </div>
  );
}
