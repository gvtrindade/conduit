'use client';

import Link from 'next/link';

interface TopNavProps {
  backHref: string;
  backLabel: string;
  title: string;
  onMore?: () => void;
}

export default function TopNav({ backHref, backLabel, title, onMore }: TopNavProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border-custom sticky top-0 z-50 bg-hull/95 backdrop-blur-sm">
      <Link
        href={backHref}
        className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.08em] uppercase text-sand no-underline hover:text-cream transition-colors"
      >
        <div className="w-[22px] h-[22px] rounded-md border border-border-custom flex items-center justify-center text-xs">
          ←
        </div>
        {backLabel}
      </Link>
      <span className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-cream">
        {title}
      </span>
      {onMore ? (
        <button
          onClick={onMore}
          className="w-[30px] h-[30px] rounded-md border border-border-custom bg-panel flex items-center justify-center cursor-pointer text-sand text-sm font-mono hover:border-sand hover:text-cream transition-all"
        >
          ⋯
        </button>
      ) : (
        <div className="w-[30px]" />
      )}
    </div>
  );
}
