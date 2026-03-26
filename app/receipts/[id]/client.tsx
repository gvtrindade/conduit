'use client';

import { useState } from 'react';
import TopNav from '@/components/top-nav';
import Badge from '@/components/badge';
import SectionLabel from '@/components/section-label';
import DataField from '@/components/data-field';
import ModalOverlay from '@/components/modal-overlay';
import Toast, { useToast } from '@/components/toast';
import { receipts } from '@/lib/mock-data';

const tagStyles: Record<string, string> = {
  ORG: 'text-green bg-green/10 border-green/25',
  SALE: 'text-amber bg-amber/10 border-amber/25',
  PRICE_SPIKE: 'text-red bg-red/10 border-red/25',
};

export default function ReceiptDetailClient({ id }: { id: string }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const receipt = receipts.find(r => r.id === id) || receipts[0];
  const categories = [
    { name: 'Produce', amount: 42.80, pct: 30, color: 'var(--green)' },
    { name: 'Dairy & Eggs', amount: 28.47, pct: 20, color: 'var(--blue)' },
    { name: 'Proteins', amount: 25.38, pct: 18, color: 'var(--amber)' },
    { name: 'Pantry', amount: 17.36, pct: 13, color: 'var(--sand)' },
    { name: 'Household', amount: 17.62, pct: 12, color: 'var(--red)' },
    { name: 'Beverages', amount: 10.98, pct: 8, color: 'var(--panel2)' },
  ];

  return (
    <div className="relative flex-1 flex flex-col">
      {showMenu && (
        <div className="absolute top-14 right-5 bg-panel border-[1.5px] border-border-custom rounded-xl overflow-hidden z-[250] min-w-[180px] shadow-2xl">
          {[
            { icon: '📤', label: 'Edit Data' },
            { icon: '📤', label: 'Export PDF' },
            { icon: '📋', label: 'Copy Link' },
            { icon: '🔁', label: 'Re-Sync' },
          ].map(item => (
            <div
              key={item.label}
              onClick={() => { setShowMenu(false); showToast(item.icon, item.label.toUpperCase()); }}
              className="flex items-center gap-2.5 px-4 py-2.5 font-mono text-[10px] font-bold tracking-[0.08em] uppercase text-sand cursor-pointer border-b border-border-custom last:border-b-0 hover:bg-panel2 hover:text-cream transition-colors"
            >
              <span className="text-xs">{item.icon}</span> {item.label}
            </div>
          ))}
          <div
            onClick={() => { setShowMenu(false); setShowDelete(true); }}
            className="flex items-center gap-2.5 px-4 py-2.5 font-mono text-[10px] font-bold tracking-[0.08em] uppercase text-red cursor-pointer hover:bg-red/8 transition-colors"
          >
            <span className="text-xs">🗑</span> Delete
          </div>
        </div>
      )}

      <TopNav
        backHref="/"
        backLabel="RCPT_LOG"
        title={`RECEIPT #${receipt.id}`}
        onMore={() => setShowMenu(!showMenu)}
      />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-7">
        <div className="px-5 pt-5">
          <div className="bg-panel border-2 border-border-custom rounded-2xl overflow-hidden relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-tight text-5xl font-bold text-cream/[0.03] uppercase pointer-events-none select-none">
              {receipt.merchant.slice(0, 2)}
            </div>
            <div className="p-4 relative z-10">
              <div className="flex items-start justify-between mb-2.5">
                <div className="w-11 h-11 rounded-xl bg-hull border border-border-custom flex items-center justify-center text-xl">🏪</div>
                <Badge variant={receipt.status === 'OK' ? 'green' : receipt.status === 'PND' ? 'amber' : 'red'}>
                  [ STATUS: {receipt.status} ]
                </Badge>
              </div>
              <div className="mt-2.5">
                <div className="font-tight text-[22px] font-bold text-cream uppercase tracking-[0.04em] leading-tight">
                  {receipt.merchant.split('_').map((w, i) => <span key={i}>{w}{i < receipt.merchant.split('_').length - 1 ? ' ' : ''}</span>)}
                </div>
                <div className="flex gap-3 items-center mt-1.5">
                  <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-sand flex items-center gap-1">
                    📅 <span className="text-cream">{receipt.date}</span>
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-sand flex items-center gap-1">
                    🕐 <span className="text-cream">14:32 GST</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-border-custom flex items-end justify-between">
          <div>
            <div className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand mb-1">// TOTAL_OUTLAY //</div>
            <div>
              <span className="font-heading text-[44px] font-bold text-cream leading-none tracking-tight">{receipt.total.toFixed(2)}</span>
              <span className="font-mono text-base text-sand ml-1.5">kCr</span>
            </div>
          </div>
          {receipt.savings && (
            <div className="bg-green/12 border border-green/30 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase text-green">
              ▼ SAVED {receipt.savings.toFixed(2)}
            </div>
          )}
        </div>

        {receipt.items.length > 0 && (
          <div className="px-5">
            <SectionLabel>// LINE_ITEMS // {receipt.itemCount} UNITS //</SectionLabel>
            <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_52px_52px_62px] px-3.5 py-[7px] bg-hull border-b border-border-custom gap-2">
                <span className="font-mono text-[8px] font-bold tracking-[0.12em] uppercase text-sand">ITEM</span>
                <span className="font-mono text-[8px] font-bold tracking-[0.12em] uppercase text-sand text-right">QTY</span>
                <span className="font-mono text-[8px] font-bold tracking-[0.12em] uppercase text-sand text-right">UNIT</span>
                <span className="font-mono text-[8px] font-bold tracking-[0.12em] uppercase text-sand text-right">TOTAL</span>
              </div>
              {receipt.items.map((item, i) => {
                const isDiscount = item.tags.includes('SALE');
                const isFlagged = item.tags.includes('PRICE_SPIKE');
                return (
                  <div key={i} className={`grid grid-cols-[1fr_52px_52px_62px] px-3.5 py-2.5 border-b border-border-custom last:border-b-0 gap-2 items-start hover:bg-panel2 transition-colors ${isFlagged ? 'bg-red/[0.06] border-l-2 border-l-red' : isDiscount ? 'bg-green/[0.05]' : ''}`}>
                    <div>
                      <div className="text-xs font-medium text-cream leading-snug">{item.name}</div>
                      <div className="flex gap-1 mt-0.5">
                        {item.tags.map(tag => (
                          <span key={tag} className={`font-mono text-[8px] uppercase tracking-wider inline-block px-1 py-px rounded-sm border ${tagStyles[tag] || 'text-sand bg-sand/10 border-sand/25'}`}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <span className="font-heading text-xs font-bold text-sand text-right pt-px">{item.qty}</span>
                    <span className="font-heading text-xs font-bold text-sand text-right pt-px">{item.unitPrice.toFixed(2)}</span>
                    <span className={`font-heading text-xs font-bold text-right pt-px ${isFlagged ? 'text-red' : isDiscount ? 'text-green' : 'text-cream'}`}>{item.total.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-5 pt-4">
          <SectionLabel>// CATEGORY_DISTRIBUTION //</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {categories.map(cat => (
              <div key={cat.name} className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: cat.color }} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-sand flex-1">{cat.name}</span>
                <div className="w-20 h-[5px] bg-hull border border-border-custom rounded-sm overflow-hidden flex-shrink-0">
                  <div className="h-full rounded-sm" style={{ width: `${cat.pct}%`, background: cat.color }} />
                </div>
                <span className="font-heading text-[11px] font-bold text-cream min-w-[44px] text-right">{cat.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pt-4">
          <SectionLabel>// TACTICAL_INTEL //</SectionLabel>
          <div className="flex flex-col gap-2">
            <div className="bg-panel border border-red/30 rounded-xl p-3 flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-red/10 flex items-center justify-center text-sm flex-shrink-0">⚠️</div>
              <div className="flex-1">
                <div className="font-mono text-[10px] font-bold tracking-[0.07em] uppercase text-cream mb-0.5">PRICE_ANOMALY: Kombucha</div>
                <div className="text-[11px] text-sand leading-relaxed">+38% above your 90-day average of 3.99 kCr.</div>
              </div>
              <Badge variant="red">SPIKE</Badge>
            </div>
            <div className="bg-panel border border-green/25 rounded-xl p-3 flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center text-sm flex-shrink-0">💰</div>
              <div className="flex-1">
                <div className="font-mono text-[10px] font-bold tracking-[0.07em] uppercase text-cream mb-0.5">SAVINGS_CAPTURED</div>
                <div className="text-[11px] text-sand leading-relaxed">Member discount saved 8.40 kCr — 5.6% below list price.</div>
              </div>
              <Badge variant="green">OK</Badge>
            </div>
          </div>
        </div>

        <div className="px-5 pt-4">
          <SectionLabel>// RECEIPT_METADATA //</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <DataField label="Log Method" value="SCAN // OCR" />
            <DataField label="Confidence" value="99.2%" valueColor="var(--green)" />
            <DataField label="Store Number" value="#SEC-7-042" />
            <DataField label="Sync Status" value="SYNCED ✓" valueColor="var(--green)" />
          </div>
        </div>

        <div className="px-5 pt-4">
          <SectionLabel>// ACTIONS //</SectionLabel>
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {[
              { icon: '📤', label: 'Export PDF', color: 'blue' as const },
              { icon: '📋', label: 'Track Items', color: 'green' as const },
              { icon: '🚩', label: 'Flag Anomaly', color: 'amber' as const },
              { icon: '🔗', label: 'Share', color: 'blue' as const },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => showToast(action.icon, action.label.toUpperCase())}
                className={`bg-panel border-[1.5px] border-border-custom rounded-xl py-3 px-2.5 flex flex-col items-center gap-1.5 cursor-pointer text-${action.color} hover:border-${action.color}/50 hover:bg-${action.color}/8 transition-all`}
                style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' }}
              >
                <span className="text-lg">{action.icon}</span>
                <span className="font-mono text-[9px] font-bold tracking-[0.08em] uppercase">{action.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowDelete(true)}
            className="w-full bg-transparent border-[1.5px] border-red/35 rounded-xl py-3.5 flex items-center justify-center gap-2.5 cursor-pointer hover:bg-red/8 hover:border-red transition-colors"
          >
            <span className="text-base">🗑</span>
            <span className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-red">[ PURGE_RECEIPT_LOG ]</span>
          </button>
        </div>
      </div>

      <ModalOverlay show={showDelete} onClose={() => setShowDelete(false)}>
        <div className="bg-hull px-5 py-3.5 border-b border-border-custom flex items-center gap-2.5">
          <span className="text-base">⚠️</span>
          <span className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-red flex-1">PURGE_CONFIRM</span>
        </div>
        <div className="p-5">
          <p className="text-sm text-sand leading-relaxed mb-4">
            You are about to permanently delete receipt <strong className="text-cream">#{receipt.id}</strong>. This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowDelete(false)} className="flex-1 bg-transparent border-[1.5px] border-border-custom rounded-lg py-3 font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-sand cursor-pointer hover:border-sand hover:text-cream transition-colors">[ ABORT ]</button>
            <button
              onClick={() => { setShowDelete(false); showToast('🗑', 'RECEIPT PURGED // LOG UPDATED'); }}
              className="flex-1 bg-red border-[1.5px] border-[#8A3434] rounded-lg py-3 font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-cream cursor-pointer hover:opacity-90 transition-opacity"
              style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' }}
            >[ CONFIRM PURGE ]</button>
          </div>
        </div>
      </ModalOverlay>

      <Toast icon={toast.icon} message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}
