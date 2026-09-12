import type { ReactNode } from "react";
import { useDebouncedCommit } from "../hooks/useDebouncedCommit";
import { clampAcTemperature, Commands, type DeviceCommand } from "../lib/commands";
import { AC_FANS, AC_MODES } from "../lib/labels";
import type { DeviceProfile } from "../lib/profile";
import {
  brightnessOf,
  colorHexOf,
  colorTemperatureOf,
  openPercentOf,
} from "../lib/status";
import type { AcState, DeviceStatus } from "../lib/types";
import { Pill } from "./Pill";

const KINDS_WITH_DETAIL = ["light", "curtain", "ac", "media", "irlight", "irfan"];

/** 展開して出す操作を持っているか */
export const hasDetailPanel = (profile: DeviceProfile): boolean =>
  KINDS_WITH_DETAIL.includes(profile.kind);

type Props = {
  profile: DeviceProfile;
  status: DeviceStatus | undefined;
  ac: AcState;
  onRun: (command: DeviceCommand) => void;
  onAcChange: (next: AcState) => void;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="row">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Buttons({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Row label={label}>
      <span className="seg">{children}</span>
    </Row>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  format,
  onCommit,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (value: number) => string;
  onCommit: (value: number) => void;
}) {
  const [local, update] = useDebouncedCommit(value, onCommit);
  return (
    <Row label={label}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={(event) => update(Number(event.target.value))}
      />
      <output>{format(local)}</output>
    </Row>
  );
}

function ColorField({ value, onCommit }: { value: string; onCommit: (hex: string) => void }) {
  const [local, update] = useDebouncedCommit(value, onCommit);
  return (
    <Row label="色">
      <input type="color" value={local} onChange={(event) => update(event.target.value)} />
    </Row>
  );
}

export function DetailPanel({ profile, status, ac, onRun, onAcChange }: Props) {
  switch (profile.kind) {
    case "light":
      return (
        <>
          <Slider
            label="明るさ"
            min={1}
            max={100}
            step={1}
            value={brightnessOf(status)}
            format={String}
            onCommit={(value) => onRun(Commands.brightness(value))}
          />
          {profile.hasColor && (
            <ColorField value={colorHexOf(status)} onCommit={(hex) => onRun(Commands.color(hex))} />
          )}
          {profile.hasColorTemp && (
            <Slider
              label="色温度"
              min={2700}
              max={6500}
              step={100}
              value={colorTemperatureOf(status)}
              format={(value) => `${value}K`}
              onCommit={(value) => onRun(Commands.colorTemperature(value))}
            />
          )}
        </>
      );

    case "curtain":
      return (
        <Slider
          label="開度"
          min={0}
          max={100}
          step={5}
          value={openPercentOf(status)}
          format={(value) => `${value}%`}
          onCommit={(value) => onRun(Commands.curtainPosition(value))}
        />
      );

    case "ac":
      return (
        <>
          <Row label="温度">
            <span className="stepper">
              <Pill
                onClick={() =>
                  onAcChange({ ...ac, temperature: clampAcTemperature(ac.temperature - 1) })
                }
              >
                −
              </Pill>
              <output>{ac.temperature}℃</output>
              <Pill
                onClick={() =>
                  onAcChange({ ...ac, temperature: clampAcTemperature(ac.temperature + 1) })
                }
              >
                ＋
              </Pill>
            </span>
          </Row>
          <Buttons label="モード">
            {AC_MODES.map(([value, text]) => (
              <Pill key={value} active={ac.mode === value} onClick={() => onAcChange({ ...ac, mode: value })}>
                {text}
              </Pill>
            ))}
          </Buttons>
          <Buttons label="風量">
            {AC_FANS.map(([value, text]) => (
              <Pill key={value} active={ac.fan === value} onClick={() => onAcChange({ ...ac, fan: value })}>
                {text}
              </Pill>
            ))}
          </Buttons>
        </>
      );

    case "media":
      return (
        <>
          <Buttons label="音量">
            <Pill onClick={() => onRun(Commands.infrared("volumeAdd", "音量 +"))}>＋</Pill>
            <Pill onClick={() => onRun(Commands.infrared("volumeSub", "音量 −"))}>−</Pill>
            <Pill onClick={() => onRun(Commands.infrared("setMute", "消音"))}>消音</Pill>
          </Buttons>
          <Buttons label="チャンネル">
            <Pill onClick={() => onRun(Commands.infrared("channelAdd", "次のチャンネル"))}>次</Pill>
            <Pill onClick={() => onRun(Commands.infrared("channelSub", "前のチャンネル"))}>前</Pill>
          </Buttons>
        </>
      );

    case "irlight":
      return (
        <Buttons label="明るさ">
          <Pill onClick={() => onRun(Commands.infrared("brightnessUp", "明るく"))}>明るく</Pill>
          <Pill onClick={() => onRun(Commands.infrared("brightnessDown", "暗く"))}>暗く</Pill>
        </Buttons>
      );

    case "irfan":
      return (
        <>
          <Buttons label="風量">
            <Pill onClick={() => onRun(Commands.infrared("lowSpeed", "弱"))}>弱</Pill>
            <Pill onClick={() => onRun(Commands.infrared("middleSpeed", "中"))}>中</Pill>
            <Pill onClick={() => onRun(Commands.infrared("highSpeed", "強"))}>強</Pill>
          </Buttons>
          <Buttons label="その他">
            <Pill onClick={() => onRun(Commands.infrared("swing", "首振り"))}>首振り</Pill>
            <Pill onClick={() => onRun(Commands.infrared("timer", "タイマー"))}>タイマー</Pill>
          </Buttons>
        </>
      );

    default:
      return null;
  }
}
