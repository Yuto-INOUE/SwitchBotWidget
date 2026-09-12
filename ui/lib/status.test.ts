import { describe, expect, it } from "vitest";
import { profileOf } from "./profile";
import { describeDevice, openPercentOf, parseStatus, readingsOf } from "./status";
import { DEFAULT_AC, type Device } from "./types";

const device = (kind: string, infrared = false, cloudEnabled = true): Device => ({
  deviceId: "d1",
  name: "テスト",
  kind,
  hubDeviceId: "",
  infrared,
  cloudEnabled,
});

describe("parseStatus", () => {
  it("power を真偽値にする", () => {
    expect(parseStatus({ power: "on" }).power).toBe(true);
    expect(parseStatus({ power: "OFF" }).power).toBe(false);
  });

  it("読み取れない場合は未定義のままにする", () => {
    expect(parseStatus({ temperature: 24 }).power).toBeUndefined();
    expect(parseStatus(null).body).toEqual({});
  });

  it("鍵は施錠を on とみなす", () => {
    expect(parseStatus({ lockState: "locked" }).power).toBe(true);
    expect(parseStatus({ lockState: "unlocked" }).power).toBe(false);
  });
});

describe("readingsOf", () => {
  it("温度と湿度を並べる", () => {
    expect(readingsOf(parseStatus({ temperature: 24.6, humidity: 47 }))).toEqual([
      { value: "24.6", unit: "℃" },
      { value: "47", unit: "%" },
    ]);
  });

  it("センサーは検知状態を出す", () => {
    expect(readingsOf(parseStatus({ moveDetected: true }))).toEqual([{ value: "検知" }]);
    expect(readingsOf(parseStatus({ openState: "open" }))).toEqual([{ value: "開" }]);
  });

  it("何も読めなければプレースホルダを返す", () => {
    expect(readingsOf(undefined)).toEqual([{ value: "—" }]);
  });
});

describe("describeDevice", () => {
  const describe_ = (dev: Device, body: unknown, ac = DEFAULT_AC) =>
    describeDevice(dev, profileOf(dev), parseStatus(body), ac);

  it("状態がなければ機種名を出す", () => {
    expect(describe_(device("Plug Mini (JP)"), {})).toBe("プラグミニ");
    expect(describe_(device("TV", true), {})).toBe("テレビ（赤外線）");
  });

  it("電池残量は少ないときだけ出す", () => {
    expect(describe_(device("Curtain3"), { battery: 90 })).not.toContain("電池");
    expect(describe_(device("Curtain3"), { battery: 22 })).toContain("電池 22%");
  });

  it("エアコンは電源が切れていることを示す", () => {
    const off = describe_(device("Air Conditioner", true), {}, { ...DEFAULT_AC, power: false });
    const on = describe_(device("Air Conditioner", true), {}, { ...DEFAULT_AC, power: true });
    expect(off).toBe("オフ · 冷房 26℃");
    expect(on).toBe("冷房 26℃");
  });

  it("クラウド連携が切れていることを伝える", () => {
    expect(describe_(device("Bot", false, false), { power: "off" })).toContain("クラウド連携が無効");
  });

  it("取得に失敗した理由をそのまま出す", () => {
    const dev = device("Plug");
    expect(describeDevice(dev, profileOf(dev), { body: {}, error: "ハブがオフラインです" }, DEFAULT_AC))
      .toBe("ハブがオフラインです");
  });
});

describe("openPercentOf", () => {
  it("API の slidePosition を開度に読み替える", () => {
    expect(openPercentOf(parseStatus({ slidePosition: 30 }))).toBe(70);
    expect(openPercentOf(undefined)).toBe(50);
  });
});
