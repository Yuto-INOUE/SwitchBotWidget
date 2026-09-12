import { useDebouncedCommit } from "../hooks/useDebouncedCommit";
import { REFRESH_OPTIONS } from "../lib/labels";
import type { Config } from "../lib/types";
import { Switch } from "./Switch";

/** 不透明度は動かした見た目をすぐ確かめたいので、確定までを短くする */
const OPACITY_COMMIT_MS = 200;

type Props = {
  config: Config;
  visibleCount: number;
  usableCount: number;
  version: string;
  onPatch: (changes: Partial<Config>) => void;
  onOpenPicker: () => void;
  onRecredential: () => void;
  onForget: () => void;
  onQuit: () => void;
};

export function SettingsPanel({
  config,
  visibleCount,
  usableCount,
  version,
  onPatch,
  onOpenPicker,
  onRecredential,
  onForget,
  onQuit,
}: Props) {
  const [opacity, setOpacity] = useDebouncedCommit(
    Math.round(config.opacity * 100),
    (value) => onPatch({ opacity: value / 100 }),
    OPACITY_COMMIT_MS,
  );

  return (
    <div className="view panel">
      <button type="button" className="btn wide" onClick={onOpenPicker}>
        <span>表示するデバイスを選ぶ</span>
        <span className="btn-note">{usableCount > 0 ? `${visibleCount} / ${usableCount} 台` : "—"}</span>
      </button>

      <div className="divider" />

      <Switch
        label="常に最前面に表示"
        checked={config.alwaysOnTop}
        onChange={(next) => onPatch({ alwaysOnTop: next })}
      />
      <Switch
        label="Windows 起動時に常駐"
        checked={config.launchAtLogin}
        onChange={(next) => onPatch({ launchAtLogin: next })}
      />
      <Switch
        label="画面の端に吸着させる"
        checked={config.snapToEdges}
        onChange={(next) => onPatch({ snapToEdges: next })}
      />

      <div className="switch-row">
        <span>不透明度</span>
        <input
          type="range"
          min={35}
          max={100}
          step={5}
          value={opacity}
          aria-label="不透明度"
          style={{ maxWidth: 140 }}
          onChange={(event) => setOpacity(Number(event.target.value))}
        />
      </div>

      <div className="switch-row">
        <span>状態の自動更新</span>
        <select
          value={config.autoRefreshSec}
          aria-label="状態の自動更新"
          onChange={(event) => onPatch({ autoRefreshSec: Number(event.target.value) })}
        >
          {REFRESH_OPTIONS.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </div>

      <div className="divider" />

      <div className="btn-row">
        <button type="button" className="btn" style={{ flex: 1 }} onClick={onRecredential}>
          トークンを入力し直す
        </button>
      </div>
      <div className="btn-row">
        <button type="button" className="btn quiet" onClick={onForget}>
          接続を解除
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn quiet" onClick={onQuit}>
          アプリを終了
        </button>
      </div>

      <p>{version ? `SwitchBot Widget ${version}` : ""}</p>
    </div>
  );
}
