import { useCallback, useRef, useState } from "react";
import { api, errorMessage } from "../lib/bridge";
import type { DeviceCommand } from "../lib/commands";
import { visibleDevices } from "../lib/ordering";
import { hasReadableStatus } from "../lib/profile";
import { parseStatus } from "../lib/status";
import type { Config, Device, DeviceStatus } from "../lib/types";
import type { Notify } from "./useToast";

/** API の呼び出し上限があるので、状態取得は少しずつ流す */
const STATUS_CONCURRENCY = 3;
/** 命令を送ってから実機に反映されるまでの待ち時間 */
const REFRESH_DELAY_MS = 1600;

/** デバイス一覧と、その状態・操作をまとめて扱う */
export function useDevices(config: Config | null, notify: Notify) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [statuses, setStatuses] = useState<ReadonlyMap<string, DeviceStatus>>(new Map());
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // コールバックを作り直さずに最新の設定を参照するための控え
  const configRef = useRef(config);
  configRef.current = config;
  const busyRef = useRef<ReadonlySet<string>>(new Set());

  const markBusy = useCallback((deviceId: string, value: boolean) => {
    const next = new Set(busyRef.current);
    if (value) next.add(deviceId);
    else next.delete(deviceId);
    busyRef.current = next;
    setBusy(next);
  }, []);

  const putStatus = useCallback((deviceId: string, status: DeviceStatus) => {
    setStatuses((prev) => new Map(prev).set(deviceId, status));
  }, []);

  const loadStatus = useCallback(
    async (device: Device) => {
      try {
        putStatus(device.deviceId, parseStatus(await api.deviceStatus(device.deviceId)));
      } catch (error) {
        putStatus(device.deviceId, { body: {}, error: errorMessage(error) });
      }
    },
    [putStatus],
  );

  const refreshStatuses = useCallback(
    async (targets: readonly Device[]) => {
      const queue = targets.filter(hasReadableStatus);
      const workers = Array.from({ length: Math.min(STATUS_CONCURRENCY, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) await loadStatus(next);
      });
      await Promise.all(workers);
      setLastSync(new Date());
    },
    [loadStatus],
  );

  /** 表示中のデバイスだけ状態を取り直す */
  const refreshVisible = useCallback(
    () => refreshStatuses(visibleDevices(devices, configRef.current)),
    [devices, refreshStatuses],
  );

  /** デバイス一覧そのものを取り直す。失敗したら呼び出し側に投げ返す */
  const reload = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setLoading(true);
      if (!silent) notify("デバイスを読み込み中…");
      try {
        const list = await api.listDevices();
        setDevices(list);
        await refreshStatuses(visibleDevices(list, configRef.current));
        return list;
      } catch (error) {
        const message = errorMessage(error);
        notify(message, true);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [notify, refreshStatuses],
  );

  /** デバイスに 1 つ命令を送る。連打は在庫中のものを無視して防ぐ */
  const run = useCallback(
    async (device: Device, command: DeviceCommand) => {
      if (busyRef.current.has(device.deviceId)) return;
      markBusy(device.deviceId, true);
      try {
        await api.runCommand(device.deviceId, command.command, command.parameter, command.commandType);

        if (command.optimisticPower !== undefined) {
          setStatuses((prev) => {
            const next = new Map(prev);
            const current = next.get(device.deviceId) ?? { body: {} };
            next.set(device.deviceId, { ...current, power: command.optimisticPower });
            return next;
          });
        }
        notify(`${device.name} ${command.label}`);

        if (command.refresh && hasReadableStatus(device)) {
          setTimeout(() => void loadStatus(device), REFRESH_DELAY_MS);
        }
      } catch (error) {
        notify(errorMessage(error), true);
      } finally {
        markBusy(device.deviceId, false);
      }
    },
    [loadStatus, markBusy, notify],
  );

  const clear = useCallback(() => {
    setDevices([]);
    setStatuses(new Map());
    setLastSync(null);
  }, []);

  return { devices, statuses, busy, loading, lastSync, reload, refreshVisible, run, clear };
}
