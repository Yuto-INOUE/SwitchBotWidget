import { useState } from "react";
import type { DeviceCommand } from "../lib/commands";
import { profileOf } from "../lib/profile";
import { describeDevice, readingsOf } from "../lib/status";
import type { AcState, Device, DeviceStatus } from "../lib/types";
import { DetailPanel, hasDetailPanel } from "./DetailPanel";
import { Icon } from "./Icon";
import { hasMainControls, MainControls } from "./MainControls";

type Props = {
  device: Device;
  status: DeviceStatus | undefined;
  ac: AcState;
  busy: boolean;
  onRun: (command: DeviceCommand) => void;
  onAcChange: (next: AcState) => void;
};

export function DeviceCard({ device, status, ac, busy, onRun, onAcChange }: Props) {
  const [open, setOpen] = useState(false);
  const profile = profileOf(device);
  const isOn = status?.power === true;
  const expandable = hasDetailPanel(profile);

  const className = ["device", isOn ? "is-on" : null, open ? "open" : null, busy ? "busy" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <div className="device-head">
        <span className="device-icon">
          <Icon name={profile.icon} />
        </span>
        <span className="device-label">
          <span className="device-name">{device.name}</span>
          <span className={`device-sub${status?.error ? " error" : ""}`}>
            {describeDevice(device, profile, status, ac)}
          </span>
        </span>

        {profile.kind === "reading" && (
          <span className="reading">
            {readingsOf(status).map((reading) => (
              <span key={reading.unit ?? reading.value}>
                <b>{reading.value}</b>
                {reading.unit && <span>{reading.unit}</span>}
              </span>
            ))}
          </span>
        )}

        {expandable && (
          <button
            type="button"
            className="expand"
            title="詳細"
            aria-label="詳細"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name="chevron" strokeWidth={2} />
          </button>
        )}
      </div>

      {hasMainControls(profile) && (
        <div className="device-controls">
          <MainControls
            profile={profile}
            status={status}
            ac={ac}
            onRun={onRun}
            onAcChange={onAcChange}
          />
        </div>
      )}

      {expandable && open && (
        <div className="device-body">
          <DetailPanel
            profile={profile}
            status={status}
            ac={ac}
            onRun={onRun}
            onAcChange={onAcChange}
          />
        </div>
      )}
    </div>
  );
}
