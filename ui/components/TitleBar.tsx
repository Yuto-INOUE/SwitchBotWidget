import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import type { View } from "../lib/types";

const TITLES: Record<View, string> = {
  devices: "SwitchBot",
  picker: "表示するデバイス",
  settings: "設定",
  setup: "SwitchBot に接続",
};

type Props = {
  view: View;
  pinned: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onTogglePicker: () => void;
  onTogglePin: () => void;
  onToggleSettings: () => void;
  onClose: () => void;
};

export function TitleBar({
  view,
  pinned,
  refreshing,
  onRefresh,
  onTogglePicker,
  onTogglePin,
  onToggleSettings,
  onClose,
}: Props) {
  return (
    // ここをつかんでウィンドウを動かす
    <header className="titlebar" data-tauri-drag-region>
      <span className="brand" data-tauri-drag-region>
        <Icon name="logo" strokeWidth={2} />
        <span>{TITLES[view]}</span>
      </span>
      <span className="spacer" data-tauri-drag-region />
      <div className="tools">
        <IconButton name="refresh" title="更新 (F5)" onClick={onRefresh} spinning={refreshing} />
        <IconButton
          name="list"
          title="表示するデバイスを選ぶ"
          onClick={onTogglePicker}
          pressed={view === "picker"}
        />
        <IconButton name="pin" title="常に最前面" onClick={onTogglePin} pressed={pinned} />
        <IconButton
          name="gear"
          title="設定"
          onClick={onToggleSettings}
          pressed={view === "settings"}
        />
        <IconButton name="close" title="閉じる（トレイに常駐）" onClick={onClose} danger />
      </div>
    </header>
  );
}
