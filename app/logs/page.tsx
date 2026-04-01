'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import TopNav from '@/components/top-nav';
import Badge from '@/components/badge';
import { RECEIPTS_WITH_MERCHANT_QUERY, mapDbReceiptToReceipt, type DbReceiptRow } from '@/lib/receipt-queries';
import type { Receipt } from '@/lib/types';

export default function LogsPage() {
  const { data: rawReceipts, isLoading } = useQuery(RECEIPTS_WITH_MERCHANT_QUERY);

  const receipts: Receipt[] = useMemo(
    () => (rawReceipts as unknown as DbReceiptRow[]).map(mapDbReceiptToReceipt),
    [rawReceipts]
  );

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
          <div className="font-mono text-[10px] text-panel2">Loading log entries...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <TopNav
        backHref="/"
        backLabel="DASH"
        title="FULL_LOG // ALL_ENTRIES"
      />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-7">
        <div className="px-5 pt-4">
          <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.7fr] px-2.5 py-2 bg-hull border-b border-border-custom gap-2">
              <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">DATE</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">MERCHANT</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">COST</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">ITEMS</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">STATUS</span>
            </div>
            {receipts.map((r, i) => (
              <Link key={r.id} href={`/receipts/${r.id}`} className={`no-underline col-span-full grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.7fr] px-2.5 py-[9px] border-b border-border-custom last:border-b-0 gap-2 items-center ${i % 2 === 0 ? 'bg-panel' : 'bg-panel2'} cursor-pointer hover:bg-panel2 transition-colors`}>
                <span className="font-mono text-[10px] text-sand">{r.date}</span>
                <span className="text-xs text-cream">{r.merchant}</span>
                <span className="font-heading text-xs font-bold text-cream">{r.total.toFixed(2)}</span>
                <span className="font-mono text-[10px] text-sand">{r.itemCount}</span>
                <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
              </Link>
            ))}
          </div>
        </div>

        {receipts.length === 0 && (
          <div className="px-5 pt-4">
            <div className="bg-panel border-2 border-border-custom rounded-xl p-6 text-center">
              <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-sand">NO_LOG_ENTRIES</div>
              <div className="font-mono text-[9px] text-panel2 mt-1">No receipts have been logged yet.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
