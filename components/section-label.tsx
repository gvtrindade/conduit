interface SectionLabelProps {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export default function SectionLabel({ children, right, className = '' }: SectionLabelProps) {
  return (
    <div className={`flex items-center justify-between font-mono text-[11px] font-bold tracking-[0.18em] uppercase text-sand border-b border-border-custom pb-1.5 mb-3 ${className}`}>
      <span>{children}</span>
      {right && <span className="text-[8px] text-panel2">{right}</span>}
    </div>
  );
}
