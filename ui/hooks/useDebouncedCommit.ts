import { useEffect, useRef, useState } from "react";

const DEFAULT_DELAY_MS = 400;

/**
 * つまみや色見本を動かしている間は送信せず、手が止まってから 1 回だけ確定させる。
 * 外から値が変わった（状態を取り直した）ときは表示を合わせ直す。
 */
export function useDebouncedCommit<T>(
  external: T,
  onCommit: (value: T) => void,
  delay = DEFAULT_DELAY_MS,
): [T, (value: T) => void] {
  const [local, setLocal] = useState(external);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setLocal(external), [external]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (value: T) => {
    setLocal(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(value), delay);
  };

  return [local, update];
}
