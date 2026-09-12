import { describe, expect, it } from "vitest";
import { hasReadableStatus, profileOf } from "./profile";
import type { Device } from "./types";

const device = (kind: string, infrared = false): Device => ({
  deviceId: "d1",
  name: "テスト",
  kind,
  hubDeviceId: "",
  infrared,
  cloudEnabled: true,
});

describe("profileOf", () => {
  it("実機を操作の形に振り分ける", () => {
    expect(profileOf(device("Bot")).kind).toBe("bot");
    expect(profileOf(device("Plug Mini (JP)")).kind).toBe("power");
    expect(profileOf(device("Curtain3")).kind).toBe("curtain");
    expect(profileOf(device("Smart Lock Pro")).kind).toBe("lock");
    expect(profileOf(device("MeterPlus")).kind).toBe("reading");
  });

  it("色を変えられる電球だけ色の操作を出す", () => {
    expect(profileOf(device("Color Bulb"))).toMatchObject({ hasColor: true, hasColorTemp: true });
    expect(profileOf(device("Ceiling Light")).hasColor).toBeUndefined();
  });

  it("ハブ本体は操作できない扱いにする", () => {
    expect(profileOf(device("Hub Mini")).kind).toBe("none");
    // ハブ 2 は温湿度が読めるので読み取り対象として残す
    expect(profileOf(device("Hub 2")).kind).toBe("reading");
  });

  it("赤外線リモコンは DIY 接頭辞を無視する", () => {
    expect(profileOf(device("DIY Air Conditioner", true)).kind).toBe("ac");
    expect(profileOf(device("Air Conditioner", true)).kind).toBe("ac");
    expect(profileOf(device("TV", true)).kind).toBe("media");
    expect(profileOf(device("Light", true)).kind).toBe("irlight");
  });

  it("知らない機種でも ON / OFF は出す", () => {
    expect(profileOf(device("Brand New Gadget")).kind).toBe("power");
  });

  it("状態を読めるのは実機だけ", () => {
    expect(hasReadableStatus(device("Plug"))).toBe(true);
    expect(hasReadableStatus(device("TV", true))).toBe(false);
    expect(hasReadableStatus(device("Hub Mini"))).toBe(false);
  });
});
