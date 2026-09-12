import { describe, expect, it } from "vitest";
import { reorder, toggleHidden, usableDevices, visibleDevices } from "./ordering";
import type { Config, Device } from "./types";

const device = (deviceId: string, name: string, kind: string): Device => ({
  deviceId,
  name,
  kind,
  hubDeviceId: "",
  infrared: false,
  cloudEnabled: true,
});

const devices: Device[] = [
  device("a", "あかり", "Color Bulb"),
  device("b", "ボット", "Bot"),
  device("c", "カーテン", "Curtain3"),
  device("hub", "ハブミニ", "Hub Mini"),
];

const config = (over: Partial<Config> = {}): Config => ({
  windowX: null,
  windowY: null,
  windowW: 360,
  windowH: 620,
  alwaysOnTop: true,
  opacity: 1,
  autoRefreshSec: 300,
  snapToEdges: true,
  autoCheckUpdates: true,
  order: [],
  hidden: [],
  acState: {},
  launchAtLogin: false,
  ...over,
});

describe("usableDevices", () => {
  it("操作できない機器を落とす", () => {
    // 並び順はここでは問わない
    expect(usableDevices(devices, []).map((d) => d.deviceId).sort()).toEqual(["a", "b", "c"]);
  });

  it("順序が未登録なら名前順に並べる", () => {
    // あかり → カーテン → ボット
    expect(usableDevices(devices, []).map((d) => d.deviceId)).toEqual(["a", "c", "b"]);
  });

  it("設定の順に並べ、未登録は名前順で後ろに置く", () => {
    const sorted = usableDevices(devices, ["c"]).map((d) => d.deviceId);
    expect(sorted[0]).toBe("c");
    // 残りは「あかり」「ボット」の名前順
    expect(sorted.slice(1)).toEqual(["a", "b"]);
  });
});

describe("visibleDevices", () => {
  it("非表示にしたものを除く", () => {
    const shown = visibleDevices(devices, config({ hidden: ["b"] }));
    expect(shown.map((d) => d.deviceId)).toEqual(["a", "c"]);
  });

  it("設定が読めていなければ何も出さない", () => {
    expect(visibleDevices(devices, null)).toEqual([]);
  });
});

describe("toggleHidden", () => {
  it("入っていなければ足し、入っていれば外す", () => {
    expect(toggleHidden([], "a")).toEqual(["a"]);
    expect(toggleHidden(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("reorder", () => {
  it("表示中の隣と入れ替える", () => {
    expect(reorder(["a", "b", "c"], ["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(reorder(["a", "b", "c"], ["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("非表示のデバイスは飛び越える", () => {
    // b は非表示。a の「下へ」は c と入れ替わる
    expect(reorder(["a", "b", "c"], ["a", "c"], "a", "down")).toEqual(["c", "b", "a"]);
  });

  it("端では並びを変えない", () => {
    expect(reorder(["a", "b"], ["a", "b"], "a", "up")).toEqual(["a", "b"]);
    expect(reorder(["a", "b"], ["a", "b"], "b", "down")).toEqual(["a", "b"]);
  });
});
