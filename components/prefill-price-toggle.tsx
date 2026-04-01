'use client';

import { useState, useEffect } from 'react';
import { usePowerSync } from '@powersync/react';
import { getPreference, setPreference } from '@/lib/user-preferences';

export default function PrefillPriceToggle() {
  const powerSync = usePowerSync();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const val = await getPreference(powerSync, 'prefill_price', true);
      if (mounted) {
        setEnabled(val as boolean);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [powerSync]);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    await setPreference(powerSync, 'prefill_price', next);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border-custom last:border-b-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-hull border border-border-custom flex items-center justify-center text-sm">💲</div>
          <div>
            <div className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-cream">Pre-fill item prices</div>
            <div className="font-mono text-[9px] text-sand mt-0.5 tracking-wider">Auto-fill from last known price</div>
          </div>
        </div>
        <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 rounded border text-sand border-sand/30 bg-sand/8">
          SYNCING...
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3.5 py-3 border-b border-border-custom last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-hull border border-border-custom flex items-center justify-center text-sm">💲</div>
        <div>
          <div className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-cream">Pre-fill item prices</div>
          <div className="font-mono text-[9px] text-sand mt-0.5 tracking-wider">Auto-fill from last known price</div>
        </div>
      </div>
      <button
        onClick={toggle}
        className={`font-mono text-[10px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 rounded border cursor-pointer ${
          enabled
            ? 'text-green border-green/30 bg-green/8'
            : 'text-sand border-sand/30 bg-sand/8'
        }`}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
