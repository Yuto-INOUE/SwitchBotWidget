import { describe, expect, it } from "vitest";
import { clampAcTemperature, Commands } from "./commands";

describe("Commands", () => {
  it("カーテンの開度は API 向けに反転する", () => {
    // UI の「開度 70%」は API では slidePosition 30
    expect(Commands.curtainPosition(70).parameter).toBe("0,ff,30");
    expect(Commands.curtainPosition(0).parameter).toBe("0,ff,100");
  });

  it("エアコンは温度・モード・風量・電源をまとめて送る", () => {
    const command = Commands.airConditioner({ temperature: 25, mode: 2, fan: 3, power: true });
    expect(command.command).toBe("setAll");
    expect(command.parameter).toBe("25,2,3,on");
    expect(command.label).toBe("25℃");
  });

  it("エアコンを消すときも同じ形式で送る", () => {
    const command = Commands.airConditioner({ temperature: 25, mode: 2, fan: 3, power: false });
    expect(command.parameter).toBe("25,2,3,off");
    expect(command.label).toBe("OFF");
  });

  it("色は #rrggbb を R:G:B に直す", () => {
    expect(Commands.color("#ff8000").parameter).toBe("255:128:0");
    expect(Commands.color("#000000").parameter).toBe("0:0:0");
  });

  it("状態を読めない操作では取り直しをしない", () => {
    expect(Commands.infrared("volumeAdd", "音量 +").refresh).toBe(false);
    expect(Commands.press().refresh).toBe(false);
    expect(Commands.turnOn().refresh).toBe(true);
  });

  it("ON / OFF は応答を待たずに画面へ反映してよい", () => {
    expect(Commands.turnOn().optimisticPower).toBe(true);
    expect(Commands.turnOff().optimisticPower).toBe(false);
    expect(Commands.curtainOpen().optimisticPower).toBeUndefined();
  });

  it("エアコンの温度は 16〜30 に収める", () => {
    expect(clampAcTemperature(35)).toBe(30);
    expect(clampAcTemperature(10)).toBe(16);
    expect(clampAcTemperature(24)).toBe(24);
  });
});
