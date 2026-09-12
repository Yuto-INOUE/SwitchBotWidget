import { profileOf } from "./profile";
import type { Config, Device } from "./types";

/** 設定の並び順に従って並べ替える。順序が決まっていないものは名前順で後ろに回す */
export function sortByConfig(devices: readonly Device[], order: readonly string[]): Device[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...devices].sort((a, b) => {
    const ra = rank.get(a.deviceId) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.deviceId) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb || a.name.localeCompare(b.name, "ja");
  });
}

/** ウィジェットから操作・表示できるデバイス（ハブ本体などは除く） */
export function usableDevices(devices: readonly Device[], order: readonly string[]): Device[] {
  return sortByConfig(devices, order).filter((d) => profileOf(d).kind !== "none");
}

/** そのうちメイン画面に出すものだけ */
export function visibleDevices(devices: readonly Device[], config: Config | null): Device[] {
  if (!config) return [];
  const hidden = new Set(config.hidden);
  return usableDevices(devices, config.order).filter((d) => !hidden.has(d.deviceId));
}

export function toggleHidden(hidden: readonly string[], id: string): string[] {
  return hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
}

/**
 * 表示中リストの中で id を 1 つ動かした並び順を返す。
 * 入れ替える相手は表示中のものから選ぶので、非表示のデバイスは飛び越える。
 */
export function reorder(
  fullOrder: readonly string[],
  visibleIds: readonly string[],
  id: string,
  direction: "up" | "down",
): string[] {
  const at = visibleIds.indexOf(id);
  const partner = visibleIds[at + (direction === "up" ? -1 : 1)];
  const next = [...fullOrder];
  if (at < 0 || partner === undefined) return next;

  const i = next.indexOf(id);
  const j = next.indexOf(partner);
  if (i < 0 || j < 0) return next;
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}
