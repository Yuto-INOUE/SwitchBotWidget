type Props = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

export function Switch({ label, checked, onChange }: Props) {
  return (
    <div className="switch-row">
      <span>{label}</span>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}
