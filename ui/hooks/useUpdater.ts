import { useCallback, useRef, useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { errorMessage } from "../lib/bridge";
import type { Notify } from "./useToast";

export type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; version: string; notes: string }
  | { kind: "downloading"; percent: number }
  | { kind: "ready" }
  | { kind: "error"; message: string };

/** まだ一度もリリースしていない間は latest.json が無いので、その場合だけ文言を変える */
const friendlyError = (error: unknown): string => {
  const message = errorMessage(error);
  if (/404|not found/i.test(message)) return "公開されている更新はまだありません";
  return message;
};

/** GitHub Releases に置いた latest.json を見て更新を確かめる */
export function useUpdater(notify: Notify) {
  const [state, setState] = useState<UpdateState>({ kind: "idle" });
  const pending = useRef<Update | null>(null);

  /** silent なら、見つかったときだけ知らせる（起動直後の自動確認用） */
  const checkForUpdate = useCallback(
    async (silent = false) => {
      setState({ kind: "checking" });
      try {
        const update = await check();
        if (!update) {
          setState({ kind: "uptodate" });
          if (!silent) notify("最新版を使っています");
          return;
        }
        pending.current = update;
        setState({ kind: "available", version: update.version, notes: update.body ?? "" });
        if (silent) notify(`新しいバージョン ${update.version} があります`);
      } catch (error) {
        setState({ kind: "error", message: friendlyError(error) });
        if (!silent) notify(friendlyError(error), true);
      }
    },
    [notify],
  );

  const install = useCallback(async () => {
    const update = pending.current;
    if (!update) return;

    let total = 0;
    let received = 0;
    setState({ kind: "downloading", percent: 0 });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          setState({
            kind: "downloading",
            percent: total > 0 ? Math.round((received / total) * 100) : 0,
          });
        }
      });
      setState({ kind: "ready" });
      notify("更新を適用します。再起動します");
      await relaunch();
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
      notify(errorMessage(error), true);
    }
  }, [notify]);

  return { state, checkForUpdate, install };
}
