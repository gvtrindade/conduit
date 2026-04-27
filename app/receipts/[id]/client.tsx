'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, usePowerSync } from '@powersync/react';
import TopNav from '@/components/top-nav';
import Badge from '@/components/badge';
import SectionLabel from '@/components/section-label';
import DataField from '@/components/data-field';
import ModalOverlay from '@/components/modal-overlay';
import Toast, { useToast } from '@/components/toast';
import { ReceiptEditForm } from '@/components/receipt-edit-form';
import { deleteReceipt, updateReceipt } from '@/lib/receipt-mutations';
import { deleteReceiptItem, updateReceiptItem, addReceiptItem } from '@/lib/receipt-item-mutations';
import { createMerchant } from '@/lib/merchant-mutations';
import { createItem } from '@/lib/item-mutations';
import { authClient } from '@/lib/auth-client';
import { saveReceiptEdits } from '@/lib/receipt-edit-helpers';
import {
  RECEIPT_DETAIL_QUERY,
  RECEIPT_ITEMS_QUERY,
  mapDbReceiptDetailToReceipt,
  mapDbReceiptItemToReceiptItem,
  type DbReceiptDetailRow,
  type DbReceiptItemRow,
} from '@/lib/receipt-detail-queries';

const tagStyles: Record<string, string> = {
  ORG: 'text-green bg-green/10 border-green/25',
  SALE: 'text-amber bg-amber/10 border-amber/25',
  PRICE_SPIKE: 'text-red bg-red/10 border-red/25',
};

export default function ReceiptDetailClient({ id, userId }: { id: string; userId: string | null }) {
  const router = useRouter();
  const powerSync = usePowerSync();
  const [showMenu, setShowMenu] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const { data: rawReceipts, isLoading: receiptLoading } = useQuery(RECEIPT_DETAIL_QUERY, [id]);
  const { data: rawItems, isLoading: itemsLoading } = useQuery(RECEIPT_ITEMS_QUERY, [id]);
  const { data: rawMerchants } = useQuery("SELECT id, name, emoji FROM merchants ORDER BY name");
  const { data: rawCatalogItems } = useQuery("SELECT id, name, unit, last_price FROM items ORDER BY name");

  const isLoading = receiptLoading || itemsLoading;

  const merchants = useMemo(() => {
    if (!rawMerchants) return [];
    return (rawMerchants as Array<{ id: string; name: string; emoji: string | null }>);
  }, [rawMerchants]);

  const catalogItems = useMemo(() => {
    if (!rawCatalogItems) return [];
    return (rawCatalogItems as Array<{ id: string; name: string; unit: string; last_price: number | null }>);
  }, [rawCatalogItems]);

  const receipt = useMemo(() => {
    const rows = rawReceipts as unknown as DbReceiptDetailRow[];
    if (!rows || rows.length === 0) return null;
    const items = (rawItems as unknown as DbReceiptItemRow[] || []).map(mapDbReceiptItemToReceiptItem);
    return mapDbReceiptDetailToReceipt(rows[0], items);
  }, [rawReceipts, rawItems]);

  const handleEditData = useCallback(() => {
    setShowMenu(false);
    if (!receipt) return;
    if (receipt.status !== 'OK') {
      showToast('🚫', `CANNOT_EDIT — STATUS: ${receipt.status}`);
      return;
    }
    setIsEditing(true);
  }, [receipt, showToast]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">LOADING_RECEIPT</div>
          <div className="font-mono text-[10px] text-panel2">Fetching receipt data...</div>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl opacity-40 mb-3">⊘</div>
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">RECEIPT_NOT_FOUND</div>
          <div className="text-xs text-panel2">Receipt #{id} does not exist.</div>
        </div>
      </div>
    );
  }

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
              onClick={() => {
                if (item.label === 'Edit Data') {
                  handleEditData();
                } else {
                  setShowMenu(false);
                  showToast(item.icon, item.label.toUpperCase());
                }
              }}
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
        title={isEditing ? `EDIT RECEIPT #${receipt.id}` : `RECEIPT #${receipt.id}`}
        onMore={isEditing ? undefined : () => setShowMenu(!showMenu)}
      />

      {isEditing ? (
        <div className="flex-1 overflow-y-auto scrollbar-none pb-7 px-5 pt-4">
          <ReceiptEditForm
            receipt={{
              merchantId: receipt.merchantId ?? '',
              date: receipt.date,
              items: receipt.items.map(item => ({
                receiptItemId: item.id ?? '',
                itemId: item.itemId ?? '',
                name: item.name,
                qty: item.qty,
                unitPrice: item.unitPrice,
                total: item.total,
              })),
            }}
            merchants={merchants}
            items={catalogItems}
            onSubmit={async (data) => {
              try {
                const total = data.items.reduce((sum, i) => sum + i.total, 0);
                const itemCount = data.items.length;

                await saveReceiptEdits(powerSync, {
                  receiptId: id,
                  merchantId: data.merchantId,
                  date: data.date,
                  total,
                  itemCount,
                  userId: userId,
                  originalItems: receipt.items.map(item => ({
                    receiptItemId: item.id ?? '',
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                  })),
                  submittedItems: data.items.map(item => ({
                    receiptItemId: item.receiptItemId,
                    itemId: item.itemId,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                  })),
                }, { updateReceipt, deleteReceiptItem, updateReceiptItem, addReceiptItem });

                showToast('✦', 'RECEIPT_UPDATED');
                setIsEditing(false);
              } catch (error) {
                console.error('Failed to save receipt edits:', error);
                showToast('⚠️', 'SAVE_FAILED // RETRY');
              }
            }}
            onCancel={() => setIsEditing(false)}
            onCreateMerchant={async (name, emoji) => {
              return await createMerchant(powerSync, { name, emoji, user_id: userId, created_at: null });
            }}
            onCreateItem={async (data) => {
              return await createItem(powerSync, {
                name: data.name,
                codename: null,
                code: null,
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
        </div>
      ) : (
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
          <SectionLabel>// RECEIPT_METADATA //</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <DataField label="Log Method" value="SYNCED" />
            <DataField label="Confidence" value="SERVER" valueColor="var(--green)" />
            <DataField label="Sync Status" value="SYNCED ✓" valueColor="var(--green)" />
            <DataField label="Items" value={`${receipt.itemCount}`} />
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
      )}

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
              onClick={async () => {
                setIsDeleting(true);
                try {
                  await deleteReceipt(powerSync, id, userId);
                  setShowDelete(false);
                  showToast('🗑', 'RECEIPT PURGED // LOG UPDATED');
                  router.push('/');
                } catch (error) {
                  console.error('Failed to delete receipt:', error);
                  showToast('⚠️', 'DELETE FAILED // RETRY');
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
              className="flex-1 bg-red border-[1.5px] border-[#8A3434] rounded-lg py-3 font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-cream cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' }}
            >[ {isDeleting ? 'PURGING...' : 'CONFIRM PURGE'} ]</button>
          </div>
        </div>
      </ModalOverlay>

      <Toast icon={toast.icon} message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}
