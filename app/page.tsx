'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useQuery } from '@powersync/react';
import Badge from '@/components/badge';
import SectionLabel from '@/components/section-label';
import ModalOverlay, { ModalHeader, ModalBody } from '@/components/modal-overlay';
import Toast, { useToast } from '@/components/toast';
import { RECEIPTS_WITH_MERCHANT_QUERY, mapDbReceiptToReceipt, type DbReceiptRow } from '@/lib/receipt-queries';
import type { Receipt } from '@/lib/types';

export default function DashboardPage() {
  const [modalType, setModalType] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [qrStatus, setQrStatus] = useState('SCANNING');

  const { data: rawReceipts, isLoading } = useQuery(RECEIPTS_WITH_MERCHANT_QUERY);

  const receipts: Receipt[] = useMemo(
    () => (rawReceipts as unknown as DbReceiptRow[]).map(mapDbReceiptToReceipt),
    [rawReceipts]
  );

  const lastReceipt = receipts[0];
  const recentReceipts = receipts.slice(1);

  const statusVariant = (s: string) => {
    if (s === 'OK') return 'green' as const;
    if (s === 'PND') return 'amber' as const;
    return 'red' as const;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">SYNCING_DATA</div>
          <div className="font-mono text-[10px] text-panel2">Loading dashboard from local store...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Register Receipt Block */}
        <div className="px-5 py-3.5 border-b border-border-custom">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-mono text-[9px] font-bold tracking-[0.18em] uppercase text-sand">
              // LOG_NEW_RECEIPT //
            </span>
            <span className="font-mono text-[8px] font-bold tracking-[0.1em] uppercase text-blue bg-blue/10 border border-blue/30 px-2 py-0.5 rounded-sm">
              + REGISTER
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setModalType('qr')}
              className="bg-panel border border-blue/35 rounded-xl py-3.5 px-2 flex flex-col items-center gap-2 cursor-pointer text-blue hover:border-blue hover:bg-blue/8 transition-all relative overflow-hidden"
            >
              <span className="text-xl leading-none relative z-10">▦</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase leading-tight text-center relative z-10">QR<br/>CODE</span>
              <span className="font-mono text-[8px] tracking-wider text-sand text-center relative z-10">Read<br/>ticket</span>
            </button>
            <button
              onClick={() => setModalType('scan')}
              className="bg-panel border border-green/35 rounded-xl py-3.5 px-2 flex flex-col items-center gap-2 cursor-pointer text-green hover:border-green hover:bg-green/7 transition-all relative overflow-hidden"
            >
              <span className="text-xl leading-none relative z-10">⬚</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase leading-tight text-center relative z-10">SCAN<br/>RCPT</span>
              <span className="font-mono text-[8px] tracking-wider text-sand text-center relative z-10">Camera<br/>capture</span>
            </button>
            <button
              onClick={() => setModalType('manual')}
              className="bg-panel border border-amber/35 rounded-xl py-3.5 px-2 flex flex-col items-center gap-2 cursor-pointer text-amber hover:border-amber hover:bg-amber/7 transition-all relative overflow-hidden"
            >
              <span className="text-xl leading-none relative z-10">⌨</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase leading-tight text-center relative z-10">MANUAL<br/>ENTRY</span>
              <span className="font-mono text-[8px] tracking-wider text-sand text-center relative z-10">Type<br/>data</span>
            </button>
          </div>
        </div>

        {/* Last Transaction */}
        <div className="px-5 pt-4">
          <SectionLabel>// LAST_TRANSACTION //</SectionLabel>
          {lastReceipt ? (
            <Link href={`/receipts/${lastReceipt.id}`} className="no-underline">
              <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden cursor-pointer hover:border-sand transition-colors">
                <div className="bg-hull px-3.5 py-2 border-b border-border-custom">
                  <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">
                    MERCHANT: <strong className="text-cream">{lastReceipt.merchant}</strong>
                  </span>
                  <br/>
                  <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">
                    DATE: <strong className="text-cream">{lastReceipt.date}</strong>
                  </span>
                </div>
                <div className="p-3.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-heading text-3xl font-bold text-cream">{lastReceipt.total.toFixed(2)}</span>
                      <span className="font-mono text-sm text-sand ml-1.5">kCr</span>
                    </div>
                    <Badge variant={statusVariant(lastReceipt.status)}>[ STATUS: {lastReceipt.status} ]</Badge>
                  </div>
                  <div className="font-mono text-[10px] text-sand tracking-[0.08em] uppercase mt-1">
                    ITEMS: {lastReceipt.itemCount}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-panel border-2 border-border-custom rounded-xl p-6 text-center">
              <div className="text-2xl opacity-40 mb-2">📋</div>
              <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-sand">NO_RECEIPTS_YET</div>
              <div className="font-mono text-[9px] text-panel2 mt-1">Register your first receipt above.</div>
            </div>
          )}
        </div>

        {/* Recent Log Entries */}
        <div className="px-5 pt-4">
          <div className="flex justify-between items-center mb-3">
            <SectionLabel className="!mb-0 !border-none !pb-0">// RECENT_LOG_ENTRIES //</SectionLabel>
            <span className="font-mono text-[9px] text-blue cursor-pointer">[ SEE_FULL_LOGS ]</span>
          </div>
          {recentReceipts.length > 0 ? (
            <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-hull">
                    <th className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand text-left px-2.5 py-2 border-b border-border-custom">ID</th>
                    <th className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand text-left px-2.5 py-2 border-b border-border-custom">MERCHANT</th>
                    <th className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand text-left px-2.5 py-2 border-b border-border-custom">COST</th>
                    <th className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand text-left px-2.5 py-2 border-b border-border-custom">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReceipts.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 0 ? 'bg-panel' : 'bg-panel2'}>
                      <td className="font-mono text-[10px] text-sand px-2.5 py-[9px]">{r.id}</td>
                      <td className="text-xs text-cream px-2.5 py-[9px]">{r.merchant}</td>
                      <td className="font-heading text-xs font-bold text-cream px-2.5 py-[9px]">{r.total.toFixed(2)}</td>
                      <td className="px-2.5 py-[9px]">
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-panel border-2 border-border-custom rounded-xl p-6 text-center">
              <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-sand">NO_LOG_ENTRIES</div>
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      <ModalOverlay show={modalType === 'qr'} onClose={() => { setModalType(null); setQrStatus('SCANNING'); }}>
        <ModalHeader title="QR_CODE // READER" titleColor="var(--blue)" onClose={() => { setModalType(null); setQrStatus('SCANNING'); }} />
        <ModalBody>
          <div className="w-44 h-44 mx-auto mb-4 border-2 border-blue rounded-lg bg-hull relative flex items-center justify-center">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue" />
            <div
              className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue to-transparent"
              style={{ animation: 'scan-beam 2s ease-in-out infinite', boxShadow: '0 0 8px #5B8A9E' }}
            />
            <span className="text-4xl opacity-15">▦</span>
          </div>
          <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-blue text-center mb-4">
            {qrStatus}<span style={{ animation: 'pulse-dot 1s step-end infinite' }}>...</span>
          </div>
          <button
            onClick={() => {
              setQrStatus('READING...');
              setTimeout(() => {
                setQrStatus('✓ QR DETECTED');
                setTimeout(() => { setModalType(null); setQrStatus('SCANNING'); }, 1200);
              }, 1200);
            }}
            className="w-full bg-blue border-2 border-[#4A7A8D] rounded-lg py-3 font-mono text-xs font-bold tracking-[0.1em] uppercase text-cream cursor-pointer hover:opacity-90 transition-opacity"
          >
            [ SIMULATE_QR_DETECT ]
          </button>
        </ModalBody>
      </ModalOverlay>

      {/* Scan Modal */}
      <ModalOverlay show={modalType === 'scan'} onClose={() => setModalType(null)}>
        <ModalHeader title="RECEIPT_SCANNER // OPTICAL" titleColor="var(--green)" onClose={() => setModalType(null)} />
        <ModalBody>
          <div className="w-full h-44 bg-hull border border-border-custom rounded-lg relative overflow-hidden flex items-center justify-center mb-4">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(120,168,144,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120,168,144,0.06) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />
            <div className="w-20 h-28 border-[1.5px] border-dashed border-green/30 rounded flex items-center justify-center text-3xl opacity-40 relative z-10">
              🧾
            </div>
            <div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green to-transparent"
              style={{ animation: 'scan-beam 2s ease-in-out infinite', boxShadow: '0 0 12px #78A890' }}
            />
            {['tl','tr','bl','br'].map(p => (
              <div key={p} className={`absolute w-4 h-4 ${p.includes('t') ? 'top-2' : 'bottom-2'} ${p.includes('l') ? 'left-2' : 'right-2'} border-${p.includes('t') ? 't' : 'b'}-2 border-${p.includes('l') ? 'l' : 'r'}-2 border-green`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex-1 bg-transparent border-[1.5px] border-green text-green rounded-lg py-3 font-mono text-[11px] font-bold tracking-widest uppercase cursor-pointer hover:bg-green/10 transition-colors">
              [ RETAKE ]
            </button>
            <button
              onClick={() => showToast('📸', 'RECEIPT_CAPTURED // OCR PROCESSING')}
              className="flex-[2] bg-amber border-2 border-[#C07830] rounded-lg py-3 font-mono text-[11px] font-bold tracking-widest uppercase text-hull cursor-pointer hover:opacity-90 transition-opacity"
              style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' }}
            >
              [[ CAPTURE ]]
            </button>
          </div>
        </ModalBody>
      </ModalOverlay>

      {/* Manual Entry Modal */}
      <ModalOverlay show={modalType === 'manual'} onClose={() => setModalType(null)}>
        <ModalHeader title="MANUAL_ENTRY // RECEIPT" titleColor="var(--amber)" onClose={() => setModalType(null)} />
        <ModalBody>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5">// MERCHANT_ID //</label>
              <input className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2" placeholder="SECTOR_7_WHOLE_FOODS" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5">// DATE //</label>
                <input className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2" placeholder="2024.10.14" />
              </div>
              <div className="flex-1">
                <label className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5">// TOTAL kCr //</label>
                <input className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2" placeholder="142.20" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5">// ITEMS //</label>
                <input className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2" placeholder="12" />
              </div>
              <div className="flex-1">
                <label className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5">// CATEGORY //</label>
                <input className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2" placeholder="PROVISIONS" />
              </div>
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-sand block mb-1.5">// NOTES //</label>
              <input className="w-full bg-hull border-[1.5px] border-border-custom rounded-md px-3.5 py-2.5 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2" placeholder="Optional mission notes..." />
            </div>
            <button
              onClick={() => { showToast('✓', 'RECEIPT_LOGGED // OK'); setModalType(null); }}
              className="w-full bg-amber border-2 border-[#C07830] rounded-lg py-3 font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-hull cursor-pointer mt-1 hover:opacity-90 transition-opacity"
              style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' }}
            >
              [ LOG_RECEIPT_TO_MANIFEST ]
            </button>
          </div>
        </ModalBody>
      </ModalOverlay>

      <Toast icon={toast.icon} message={toast.message} visible={toast.visible} onClose={hideToast} />

      <style jsx>{`
        @keyframes scan-beam {
          0%, 100% { top: 12px; opacity: 0.9; }
          50% { top: calc(100% - 14px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
