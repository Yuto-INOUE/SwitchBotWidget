import type { Toast } from "../hooks/useToast";

type Props = {
  toast: Toast | null;
  visibleCount: number;
  lastSync: Date | null;
};

const formatTime = (date: Date | null): string =>
  date ? date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "—";

export function StatusBar({ toast, visibleCount, lastSync }: Props) {
  return (
    <footer className={`statusbar${toast?.isError ? " error" : ""}`}>
      <span className="dot" />
      <span>{toast?.text ?? `${visibleCount} 台 · 最終更新 ${formatTime(lastSync)}`}</span>
    </footer>
  );
}
