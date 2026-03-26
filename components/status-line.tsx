'use client';

interface StatusLineProps {
  status?: string;
  info?: string;
  pageName?: string;
}

export default function StatusLine({ status = 'SYS_ONLINE', info = 'SD: 2024.10.14', pageName = '' }: StatusLineProps) {
  const isOffline = status.includes('OFFLINE');
  const dotColor = isOffline ? 'bg-red' : 'bg-green';
  const dotShadow = isOffline ? '0 0 6px #A64444' : '0 0 6px #78A890';
  const displayStatus = pageName ? `${status} // ${pageName}` : status;

  return (
    <div className="flex items-center gap-2 px-5 py-1.5 bg-hull border-b border-border-custom">
      <div
        className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
        style={{
          boxShadow: dotShadow,
          animation: isOffline ? undefined : 'pulse-dot 2s infinite',
        }}
      />
      <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-sand">
        {displayStatus}
      </span>
      <span className="font-mono text-[9px] text-sand ml-auto">{info}</span>
    </div>
  );
}
