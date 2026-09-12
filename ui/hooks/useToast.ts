import { useCallback, useEffect, useRef, useState } from "react";

export type Toast = { text: string; isError: boolean };
export type Notify = (text: string, isError?: boolean) => void;

const HIDE_AFTER = { normal: 2500, error: 6000 } as const;

/** ステータスバーに出す一時メッセージ */
export function useToast(): { toast: Toast | null; notify: Notify } {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback<Notify>((text, isError = false) => {
    clearTimeout(timer.current);
    setToast({ text, isError });
    timer.current = setTimeout(() => setToast(null), isError ? HIDE_AFTER.error : HIDE_AFTER.normal);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, notify };
}
