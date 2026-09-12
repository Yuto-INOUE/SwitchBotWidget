import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeviceList } from "./components/DeviceList";
import { DevicePicker } from "./components/DevicePicker";
import { SettingsPanel } from "./components/SettingsPanel";
import { SetupPanel } from "./components/SetupPanel";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { useConfig } from "./hooks/useConfig";
import { useDevices } from "./hooks/useDevices";
import { useToast } from "./hooks/useToast";
import { api, errorMessage } from "./lib/bridge";
import { Commands, type DeviceCommand } from "./lib/commands";
import { reorder, toggleHidden, usableDevices, visibleDevices } from "./lib/ordering";
import { DEFAULT_AC, type AcState, type Device, type View } from "./lib/types";

export default function App() {
  const { toast, notify } = useToast();
  const { config, patch, rememberAc } = useConfig(notify);
  const { devices, statuses, busy, loading, lastSync, reload, refreshVisible, run, clear } =
    useDevices(config, notify);

  const [view, setView] = useState<View>("devices");
  const [version, setVersion] = useState("");
  const [connecting, setConnecting] = useState(false);

  const visible = useMemo(() => visibleDevices(devices, config), [devices, config]);
  const usable = useMemo(
    () => (config ? usableDevices(devices, config.order) : []),
    [devices, config],
  );

  /** 一覧を取り直す。トークンが未設定なら接続画面に戻す */
  const loadDevices = useCallback(
    async (silent = false) => {
      try {
        await reload({ silent });
      } catch (error) {
        if (errorMessage(error).includes("トークン")) setView("setup");
      }
    },
    [reload],
  );

  // 起動時の 1 回だけ。開発時の二重実行で API を無駄打ちしないよう見張る
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    void api.version().then(setVersion).catch(() => undefined);
    void (async () => {
      const configured = await api.isConfigured().catch(() => false);
      if (configured) await loadDevices(true);
      else setView("setup");
    })();
  }, [loadDevices]);

  // 不透明度はウィンドウ全体に掛ける
  useEffect(() => {
    document.documentElement.style.setProperty("--window-opacity", String(config?.opacity ?? 1));
  }, [config?.opacity]);

  // 状態の自動更新。隠れている間や別画面では呼ばない
  useEffect(() => {
    const interval = config?.autoRefreshSec ?? 0;
    if (interval <= 0) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && view === "devices") void refreshVisible();
    }, interval * 1000);
    return () => clearInterval(id);
  }, [config?.autoRefreshSec, refreshVisible, view]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F5") {
        event.preventDefault();
        void loadDevices();
      }
      if (event.key === "Escape") {
        // 別画面を開いているときは、まず一覧に戻す
        if (view === "devices" || view === "setup") void api.hideWindow();
        else setView("devices");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loadDevices, view]);

  useEffect(() => {
    const unlisten = api.onTrayAction((action) => {
      if (action === "refresh") void loadDevices();
      if (action === "settings") setView("settings");
    });
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, [loadDevices]);

  const handleAcChange = useCallback(
    async (device: Device, next: AcState) => {
      const current = config?.acState[device.deviceId] ?? DEFAULT_AC;
      await rememberAc(device.deviceId, next);

      // 消えたままの温度変更は送っても意味がないので、覚えるだけにする
      if (!current.power && !next.power) {
        notify(`${device.name} 設定を保存しました（電源オフのため送信せず）`);
        return;
      }
      await run(device, Commands.airConditioner(next));
    },
    [config, notify, rememberAc, run],
  );

  const handleRun = useCallback(
    (device: Device, command: DeviceCommand) => void run(device, command),
    [run],
  );

  const handleToggleDevice = useCallback(
    (deviceId: string) => {
      if (!config) return;
      void patch({ hidden: toggleHidden(config.hidden, deviceId) });
    },
    [config, patch],
  );

  const handleMoveDevice = useCallback(
    (deviceId: string, direction: "up" | "down") => {
      void patch({
        order: reorder(
          usable.map((device) => device.deviceId),
          visible.map((device) => device.deviceId),
          deviceId,
          direction,
        ),
      });
    },
    [patch, usable, visible],
  );

  const handleConnect = useCallback(
    async (token: string, secret: string) => {
      if (!token || !secret) {
        notify("トークンとシークレットを入力してください", true);
        return;
      }
      setConnecting(true);
      try {
        await api.saveCredentials(token, secret);
        notify("接続しました");
        setView("devices");
        await loadDevices(true);
      } catch (error) {
        notify(errorMessage(error), true);
      } finally {
        setConnecting(false);
      }
    },
    [loadDevices, notify],
  );

  const handleForget = useCallback(async () => {
    try {
      await api.forgetCredentials();
      clear();
      setView("setup");
      notify("接続を解除しました");
    } catch (error) {
      notify(errorMessage(error), true);
    }
  }, [clear, notify]);

  const toggleView = (target: View) => setView((current) => (current === target ? "devices" : target));

  if (!config) return <div className="app" />;

  return (
    <div className="app">
      <TitleBar
        view={view}
        pinned={config.alwaysOnTop}
        refreshing={loading}
        onRefresh={() => void loadDevices()}
        onTogglePicker={() => toggleView("picker")}
        onTogglePin={() => void patch({ alwaysOnTop: !config.alwaysOnTop })}
        onToggleSettings={() => toggleView("settings")}
        onClose={() => void api.hideWindow()}
      />

      {view === "devices" && (
        <DeviceList
          devices={visible}
          statuses={statuses}
          busy={busy}
          acStates={config.acState}
          hasUsableDevices={usable.length > 0}
          onRun={handleRun}
          onAcChange={(device, next) => void handleAcChange(device, next)}
          onOpenPicker={() => setView("picker")}
        />
      )}

      {view === "picker" && (
        <DevicePicker
          devices={devices}
          config={config}
          onToggle={handleToggleDevice}
          onMove={handleMoveDevice}
          onDone={() => setView("devices")}
        />
      )}

      {view === "settings" && (
        <SettingsPanel
          config={config}
          visibleCount={visible.length}
          usableCount={usable.length}
          version={version}
          onPatch={(changes) => void patch(changes)}
          onOpenPicker={() => setView("picker")}
          onRecredential={() => setView("setup")}
          onForget={() => void handleForget()}
          onQuit={() => void api.quitApp()}
        />
      )}

      {view === "setup" && (
        <SetupPanel
          canCancel={devices.length > 0}
          busy={connecting}
          onSubmit={(token, secret) => void handleConnect(token, secret)}
          onCancel={() => setView("devices")}
        />
      )}

      <StatusBar toast={toast} visibleCount={visible.length} lastSync={lastSync} />
    </div>
  );
}
