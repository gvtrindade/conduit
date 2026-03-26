interface DataFieldProps {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  className?: string;
}

export default function DataField({ label, value, valueColor, sub, className = '' }: DataFieldProps) {
  return (
    <div className={`bg-hull border border-border-custom rounded-lg p-3 ${className}`}>
      <div className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand mb-1">
        {label}
      </div>
      <div
        className="font-heading text-sm font-bold text-cream leading-tight"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[9px] text-sand mt-1">{sub}</div>
      )}
    </div>
  );
}
