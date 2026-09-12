import type { UpdateState } from "../hooks/useUpdater";

type Props = {
  version: string;
  state: UpdateState;
  onCheck: () => void;
  onInstall: () => void;
};

const describe = (state: UpdateState): string => {
  switch (state.kind) {
    case "checking":
      return "確認しています…";
    case "uptodate":
      return "最新版です";
    case "available":
      return `バージョン ${state.version} が公開されています`;
    case "downloading":
      return `ダウンロード中 ${state.percent}%`;
    case "ready":
      return "再起動して適用します";
    case "error":
      return state.message;
    default:
      return "";
  }
};

export function UpdateSection({ version, state, onCheck, onInstall }: Props) {
  const busy = state.kind === "checking" || state.kind === "downloading" || state.kind === "ready";
  const ready = state.kind === "available";

  return (
    <div className="update-row">
      <span className="update-info">
        <span>SwitchBot Widget {version}</span>
        <span className={`btn-note${state.kind === "error" ? " error" : ""}`}>{describe(state)}</span>
      </span>
      <button
        type="button"
        className={`btn${ready ? " primary" : ""}`}
        disabled={busy}
        onClick={ready ? onInstall : onCheck}
      >
        {ready ? "更新する" : "更新を確認"}
      </button>
    </div>
  );
}
