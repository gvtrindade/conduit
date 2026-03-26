'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  icon: string;
  message: string;
  visible: boolean;
  onClose: () => void;
}

export default function Toast({ icon, message, visible, onClose }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible && !show) return null;

  return (
    <div
      className={`fixed bottom-24 left-5 right-5 bg-panel2 border border-border-custom rounded-xl px-4 py-3 flex items-center gap-3 z-[400] transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      }`}
    >
      <span className="text-sm">{icon}</span>
      <span className="font-mono text-[10px] font-bold tracking-[0.07em] uppercase text-cream flex-1">
        {message}
      </span>
      <button
        onClick={() => { setShow(false); setTimeout(onClose, 300); }}
        className="font-mono text-[9px] text-sand cursor-pointer bg-transparent border-none"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState({ visible: false, icon: '', message: '' });

  const showToast = (icon: string, message: string) => {
    setToast({ visible: true, icon, message });
  };

  const hideToast = () => {
    setToast({ visible: false, icon: '', message: '' });
  };

  return { toast, showToast, hideToast };
}
