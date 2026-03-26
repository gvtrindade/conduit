interface KpiBoxProps {
  label: string;
  value: string;
  delta: string;
  deltaType?: 'pos' | 'neg' | 'warn';
}

const deltaColors = {
  pos: 'text-green',
  neg: 'text-red',
  warn: 'text-amber',
};

export default function KpiBox({ label, value, delta, deltaType = 'warn' }: KpiBoxProps) {
  return (
    <div className="flex-1 bg-panel border border-border-custom rounded-xl p-3 flex flex-col gap-1">
      <span className="font-mono text-[8px] font-bold tracking-[0.14em] uppercase text-sand">
        {label}
      </span>
      <span className="font-heading text-lg font-bold text-cream leading-none">
        {value}
      </span>
      <span className={`font-mono text-[9px] tracking-wider ${deltaColors[deltaType]}`}>
        {delta}
      </span>
    </div>
  );
}
