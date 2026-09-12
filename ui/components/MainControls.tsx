import { Commands, type DeviceCommand } from "../lib/commands";
import type { DeviceProfile } from "../lib/profile";
import type { AcState, DeviceStatus } from "../lib/types";
import { Pill } from "./Pill";

type Props = {
  profile: DeviceProfile;
  status: DeviceStatus | undefined;
  ac: AcState;
  onRun: (command: DeviceCommand) => void;
  onAcChange: (next: AcState) => void;
};

/** 主操作を持つか（読み取り専用のデバイスは持たない） */
export const hasMainControls = (profile: DeviceProfile): boolean =>
  profile.kind !== "reading" && profile.kind !== "none";

/** カード下段の主操作。横幅いっぱいに広げて押しやすくする */
export function MainControls({ profile, status, ac, onRun, onAcChange }: Props) {
  const power = status?.power;

  const onOff = (
    <>
      <Pill variant="on" active={power === true} onClick={() => onRun(Commands.turnOn())}>
        ON
      </Pill>
      <Pill variant="off" active={power === false} onClick={() => onRun(Commands.turnOff())}>
        OFF
      </Pill>
    </>
  );

  switch (profile.kind) {
    case "reading":
    case "none":
      return null;

    case "lock":
      return (
        <>
          <Pill variant="off" active={power === false} onClick={() => onRun(Commands.unlock())}>
            解錠
          </Pill>
          <Pill variant="on" active={power === true} onClick={() => onRun(Commands.lock())}>
            施錠
          </Pill>
        </>
      );

    case "curtain":
      return (
        <>
          <Pill onClick={() => onRun(Commands.curtainOpen())}>開く</Pill>
          <Pill onClick={() => onRun(Commands.curtainPause())}>停止</Pill>
          <Pill onClick={() => onRun(Commands.curtainClose())}>閉じる</Pill>
        </>
      );

    case "bot":
      return (
        <>
          {onOff}
          <Pill onClick={() => onRun(Commands.press())}>押す</Pill>
        </>
      );

    case "vacuum":
      return (
        <>
          <Pill onClick={() => onRun(Commands.vacuum("start", "開始"))}>開始</Pill>
          <Pill onClick={() => onRun(Commands.vacuum("stop", "停止"))}>停止</Pill>
          <Pill onClick={() => onRun(Commands.vacuum("dock", "充電に戻る"))}>充電</Pill>
        </>
      );

    case "ac":
      // 赤外線エアコンは状態を読めないので、覚えている設定を基準に切り替える
      return (
        <>
          <Pill variant="on" active={ac.power} onClick={() => onAcChange({ ...ac, power: true })}>
            ON
          </Pill>
          <Pill variant="off" active={!ac.power} onClick={() => onAcChange({ ...ac, power: false })}>
            OFF
          </Pill>
        </>
      );

    default:
      return onOff;
  }
}
