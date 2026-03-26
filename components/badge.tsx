'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'sand';
  className?: string;
}

const variantStyles: Record<string, string> = {
  green: 'text-green bg-green/10 border-green/30',
  amber: 'text-amber bg-amber/10 border-amber/30',
  red: 'text-red bg-red/10 border-red/30',
  blue: 'text-blue bg-blue/10 border-blue/30',
  sand: 'text-sand bg-sand/10 border-sand/30',
};

export default function Badge({ children, variant = 'green', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
