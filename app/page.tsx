'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useQuery, useStatus } from '@powersync/react';
import { usePowerSync } from '@powersync/react';
import Badge from '@/components/badge';
import SectionLabel from '@/components/section-label';
import ModalOverlay, { ModalHeader, ModalBody } from '@/components/modal-overlay';
import Toast, { useToast } from '@/components/toast';
import { RECEIPTS_WITH_MERCHANT_QUERY, mapDbReceiptToReceipt, type DbReceiptRow } from '@/lib/receipt-queries';
import type { Receipt } from '@/lib/types';
import { ManualReceiptForm, type Merchant } from '@/components/manual-receipt-form';
import { type ItemOption } from '@/components/receipt-item-selector';
import { createMerchant } from '@/lib/merchant-mutations';
import { createItem } from '@/lib/item-mutations';
import { createReceipt } from '@/lib/receipt-mutations';

export default function DashboardPage() {
  const router = useRouter();
  const [modalType, setModalType] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [qrStatus, setQrStatus] = useState('SCANNING');
  const powerSync = usePowerSync();

  const { data: rawReceipts, isLoading } = useQuery(RECEIPTS_WITH_MERCHANT_QUERY);
  const { data: rawMerchants } = useQuery("SELECT id, name, emoji FROM merchants ORDER BY name");
  const { data: rawItems } = useQuery("SELECT id, name, unit, last_price FROM items ORDER BY name");
  const status = useStatus();
  const isInitialSync = !status.connected;

  const receipts: Receipt[] = useMemo(
    () => (rawReceipts as unknown as DbReceiptRow[]).map(mapDbReceiptToReceipt),
    [rawReceipts]
  );

  const merchants: Merchant[] = useMemo(
    () => (rawMerchants ?? []).map((m: { id: string; name: string; emoji: string | null }) => ({
      id: m.id,
      name: m.name,
      emoji: m.emoji,
    })),
    [rawMerchants]
  );

  const items: ItemOption[] = useMemo(
    () => (rawItems ?? []).map((i: { id: string; name: string; unit: string; last_price: number | null }) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      last_price: i.last_price,
    })),
    [rawItems]
  );

  const lastReceipt = receipts[0];
  const recentReceipts = receipts.slice(1, 11);

  const statusVariant = (s: string) => {
    if (s === 'OK') return 'green' as const;
    if (s === 'PND') return 'amber' as const;
    return 'red' as const;
  };

  if (isLoading || isInitialSync) {
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
            <Link href="/logs" className="font-mono text-[9px] text-blue cursor-pointer no-underline hover:underline">[ SEE_FULL_LOGS ]</Link>
          </div>
          {recentReceipts.length > 0 ? (
            <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.7fr] px-2.5 py-2 bg-hull border-b border-border-custom gap-2">
                <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">DATE</span>
                <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">MERCHANT</span>
                <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">COST</span>
                <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">STATUS</span>
              </div>
              {recentReceipts.map((r, i) => (
                <Link key={r.id} href={`/receipts/${r.id}`} className={`no-underline col-span-full grid grid-cols-[1.2fr_1fr_0.8fr_0.7fr] px-2.5 py-[9px] border-b border-border-custom last:border-b-0 gap-2 items-center ${i % 2 === 0 ? 'bg-panel' : 'bg-panel2'} cursor-pointer hover:bg-panel2 transition-colors`}>
                  <span className="font-mono text-[10px] text-sand">{r.date}</span>
                  <span className="text-xs text-cream">{r.merchant}</span>
                  <span className="font-heading text-xs font-bold text-cream">{r.total.toFixed(2)}</span>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </Link>
              ))}
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
          <ManualReceiptForm
            merchants={merchants}
            items={items}
            onSubmit={async ({ merchantId, date, items }) => {
              const total = items.reduce((sum, item) => sum + item.total, 0);
              const receiptId = await createReceipt(powerSync, {
                merchant_id: merchantId,
                receipt_date: date,
                total,
                item_count: items.length,
                status: "OK",
                savings: null,
                linked_manifest_id: null,
                processed_at: null,
                created_at: new Date().toISOString(),
                receipt_items: items.map(item => ({
                  item_id: item.itemId,
                  qty: item.qty,
                  unit_price: item.unitPrice,
                  total: item.total,
                  category_custom: null,
                  tags_custom: null,
                })),
              });
              showToast('✓', 'RECEIPT_LOGGED // OK');
              setModalType(null);
              router.push(`/receipts/${receiptId}`);
            }}
            onCancel={() => setModalType(null)}
            onCreateMerchant={async (name: string, emoji: string | null) => {
              return await createMerchant(powerSync, { name, emoji, created_at: null });
            }}
            onCreateItem={async (data: { name: string; unit: string }) => {
              return await createItem(powerSync, {
                name: data.name,
                codename: null,
                emoji: null,
                category_id: null,
                category_custom: null,
                primary_tag_id: null,
                primary_tag_custom: null,
                unit: data.unit,
                last_price: null,
                last_price_date: null,
                lowest_price: null,
                lowest_price_date: null,
                freq_source_id: null,
                created_at: null,
                updated_at: null,
              });
            }}
          />
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
