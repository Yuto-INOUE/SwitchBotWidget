import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick: () => void;
  /** ON 側は緑、OFF 側は控えめな灰色で「選ばれている」ことを示す */
  variant?: "on" | "off";
  active?: boolean;
  disabled?: boolean;
  title?: string;
};

export function Pill({ children, onClick, variant, active, disabled, title }: Props) {
  const className = ["pill", variant, active ? "active" : null].filter(Boolean).join(" ");
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}
