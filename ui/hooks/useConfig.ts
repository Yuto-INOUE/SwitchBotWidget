import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/bridge";
import type { AcState, Config } from "../lib/types";
import type { Notify } from "./useToast";

/** 設定の読み書き。保存先は Rust 側なので、ここでは持ち回すだけ */
export function useConfig(notify: Notify) {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    api
      .getConfig()
      .then(setConfig)
      .catch((error) => notify(errorMessage(error), true));
  }, [notify]);

  /** 変えたいところだけ渡す。戻り値は Rust 側で丸められた後の設定 */
  const patch = useCallback(
    async (changes: Partial<Config>) => {
      if (!config) return;
      try {
        setConfig(await api.setConfig({ ...config, ...changes }));
      } catch (error) {
        // 自動起動の登録に失敗した場合など、Rust 側が変更を拒むことがある
        notify(errorMessage(error), true);
      }
    },
    [config, notify],
  );

  /** 赤外線エアコンは状態を読めないので、送った内容を覚えておく */
  const rememberAc = useCallback(
    async (deviceId: string, ac: AcState) => {
      try {
        setConfig(await api.rememberAc(deviceId, ac));
      } catch (error) {
        notify(errorMessage(error), true);
      }
    },
    [notify],
  );

  return { config, patch, rememberAc };
}
