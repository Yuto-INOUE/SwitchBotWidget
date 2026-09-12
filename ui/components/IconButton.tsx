import { Icon, type GlyphName } from "./Icon";

type Props = {
  name: GlyphName;
  title: string;
  onClick: () => void;
  /** ピン留めや現在の画面を示すトグル状態 */
  pressed?: boolean;
  spinning?: boolean;
  danger?: boolean;
};

export function IconButton({ name, title, onClick, pressed, spinning, danger }: Props) {
  const className = ["icon-btn", danger ? "close" : null, spinning ? "spin" : null]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={className}
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <Icon name={name} strokeWidth={2} />
    </button>
  );
}
