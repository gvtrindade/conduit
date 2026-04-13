'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useQuery } from '@powersync/react';
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
import { authClient } from '@/lib/auth-client';

export default function DashboardPage() {
  const router = useRouter();
  const [modalType, setModalType] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [qrStatus, setQrStatus] = useState('SCANNING');
  const powerSync = usePowerSync();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? null;

  const { data: rawReceipts, isLoading } = useQuery(RECEIPTS_WITH_MERCHANT_QUERY);
  const { data: rawMerchants } = useQuery("SELECT id, name, emoji FROM merchants ORDER BY name");
  const { data: rawItems } = useQuery("SELECT id, name, unit, last_price FROM items ORDER BY name");

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

      {/* Entry Options Modal */}
      <ModalOverlay show={modalType === 'entry'} onClose={() => setModalType(null)}>
        <ModalHeader title="// ADD_RECEIPT //" onClose={() => setModalType(null)} />
        <ModalBody>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setModalType('manual')}
              className="bg-panel border border-amber/35 rounded-xl py-4 px-2 flex flex-col items-center gap-2 cursor-pointer text-amber hover:border-amber hover:bg-amber/7 transition-all"
            >
              <span className="text-2xl leading-none">⌨</span>
              <span className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase">MANUAL</span>
              <span className="font-mono text-[9px] text-sand">Type data</span>
            </button>
            <button
              onClick={() => {
                if (!userId) {
                  showToast('⊘', 'LOGIN_REQUIRED // PLEASE_SIGN_IN');
                } else {
                  setModalType('qr');
                }
              }}
              className={`bg-panel border rounded-xl py-4 px-2 flex flex-col items-center gap-2 transition-all ${
                userId ? 'border-blue/35 text-blue hover:border-blue hover:bg-blue/8 cursor-pointer' : 'border-sand/20 text-sand/40 cursor-not-allowed'
              }`}
            >
              <span className="text-2xl leading-none">▦</span>
              <span className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase">QR CODE</span>
              <span className="font-mono text-[9px] text-sand/60">Read ticket</span>
            </button>
          </div>
        </ModalBody>
      </ModalOverlay>

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
                user_id: userId,
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
              return await createMerchant(powerSync, { name, emoji, user_id: userId, created_at: null });
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
                user_id: userId,
                created_at: null,
                updated_at: null,
              });
            }}
          />
        </ModalBody>
      </ModalOverlay>

      <button
        onClick={() => setModalType('entry')}
        className="fixed bottom-20 right-5 w-12 h-12 rounded-xl bg-amber border-2 border-[#C07830] flex items-center justify-center text-xl cursor-pointer z-50 text-hull hover:opacity-90 transition-opacity"
        style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.3), 0 0 20px rgba(217,140,69,0.3)' }}
      >
        ＋
      </button>

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
