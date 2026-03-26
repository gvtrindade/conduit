interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  color = 'var(--green)',
  height = 'h-[5px]',
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`${height} bg-hull border border-border-custom rounded overflow-hidden ${className}`}>
      <div
        className="h-full rounded transition-all duration-400"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
