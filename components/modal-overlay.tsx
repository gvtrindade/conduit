'use client';

interface ModalOverlayProps {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ModalOverlay({ show, onClose, children }: ModalOverlayProps) {
  if (!show) return null;

  return (
    <div
      className="absolute inset-0 bg-hull/92 z-[300] flex items-end p-6 rounded-[46px] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full bg-panel border-2 border-border-custom rounded-2xl overflow-hidden transition-transform duration-300">
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose, titleColor }: { title: string; onClose: () => void; titleColor?: string }) {
  return (
    <div className="bg-hull px-5 py-3.5 border-b border-border-custom flex items-center justify-between">
      <span
        className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-cream"
        style={titleColor ? { color: titleColor } : undefined}
      >
        {title}
      </span>
      <button
        onClick={onClose}
        className="font-mono text-[10px] text-sand cursor-pointer tracking-wider uppercase px-2 py-0.5 border border-border-custom rounded bg-transparent hover:text-cream hover:border-sand transition-all"
      >
        ✕ CLOSE
      </button>
    </div>
  );
}

export function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="p-5">{children}</div>;
}
