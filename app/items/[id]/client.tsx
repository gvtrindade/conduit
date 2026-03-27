'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@powersync/react';
import TopNav from '@/components/top-nav';
import DataField from '@/components/data-field';
import SectionLabel from '@/components/section-label';
import {
  ITEM_DETAIL_QUERY,
  PRICE_HISTORY_QUERY,
  ITEM_RECEIPTS_QUERY,
  mapDbItemToItem,
  mapDbPriceHistoryToPricePoint,
  type DbItemRow,
  type DbPriceHistoryRow,
  type DbItemReceiptRow,
} from '@/lib/item-queries';

const tagStyles: Record<string, string> = {
  SALE: 'text-green bg-green/10 border-green/40',
  NORMAL: 'text-sand border-border-custom',
  '▲ HIGH': 'text-red bg-red/10 border-red/40',
  BEST: 'text-green bg-green/10 border-green/40',
};

function formatDbDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export default function ItemDetailClient({ id }: { id: string }) {
  const [chartPeriod, setChartPeriod] = useState('6M');

  const { data: rawItem, isLoading: itemLoading } = useQuery(ITEM_DETAIL_QUERY, [id]);
  const { data: rawPriceHistory, isLoading: historyLoading } = useQuery(PRICE_HISTORY_QUERY, [id]);
  const { data: rawReceipts, isLoading: receiptsLoading } = useQuery(ITEM_RECEIPTS_QUERY, [id]);

  const isLoading = itemLoading || historyLoading || receiptsLoading;

  const { item, priceHistory, recentReceipts } = useMemo(() => {
    const itemRow = (rawItem as unknown as DbItemRow[])?.[0];
    const item = itemRow ? {
      ...mapDbItemToItem(itemRow),
      freqSource: ((rawItem as unknown as DbItemRow[])?.[0] as any)?.freq_source_name || '',
    } : null;

    const priceHistory = (rawPriceHistory as unknown as DbPriceHistoryRow[]).map(
      mapDbPriceHistoryToPricePoint
    );

    const recentReceipts = (rawReceipts as unknown as DbItemReceiptRow[]).map(row => ({
      merchant: row.merchant_name || 'UNKNOWN',
      date: formatDbDate(row.receipt_date),
      id: row.id,
      price: Number(row.unit_price) || 0,
      tag: 'NORMAL' as const,
    }));

    return { item, priceHistory, recentReceipts };
  }, [rawItem, rawPriceHistory, rawReceipts]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">SYNCING_DATA</div>
          <div className="font-mono text-[10px] text-panel2">Loading item from local store...</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="relative flex-1 flex flex-col">
        <TopNav
          backHref="/items"
          backLabel="RESOURCE_REGISTRY"
          title="NOT FOUND"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl opacity-40 mb-3">⊘</div>
            <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">ITEM_NOT_FOUND</div>
            <div className="text-xs text-panel2">This item does not exist in the database.</div>
          </div>
        </div>
      </div>
    );
  }

  const points = priceHistory.length > 0 ? priceHistory.map((p, i) => {
    const x = 30 + (i / (priceHistory.length - 1)) * 250;
    const minP = Math.min(...priceHistory.map(h => h.price));
    const maxP = Math.max(...priceHistory.map(h => h.price));
    const range = maxP - minP || 1;
    const y = 120 - ((p.price - minP) / range) * 90;
    return { x, y, ...p };
  }) : [];

  const pathD = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (p.x - prev.x) / 3;
    const cpx2 = p.x - (p.x - prev.x) / 3;
    return `C ${cpx1} ${prev.y}, ${cpx2} ${p.y}, ${p.x} ${p.y}`;
  }).join(' ');

  const fillD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z` : '';

  return (
    <div className="relative flex-1 flex flex-col">
      <TopNav
        backHref="/items"
        backLabel="RESOURCE_REGISTRY"
        title={item.name}
      />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-6">
        <div className="px-5 py-3 flex gap-4 items-start">
          <div className="w-16 h-16 flex-shrink-0 bg-panel border-2 border-border-custom rounded-lg flex items-center justify-center text-3xl relative overflow-hidden">
            {item.emoji}
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.4) 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
          </div>
          <div className="flex-1">
            <div className="font-mono text-[9px] text-sand tracking-[0.14em] uppercase mb-1">RESOUR_ID: {item.codename}</div>
            <div className="font-tight text-xl font-bold text-cream uppercase tracking-[0.04em] leading-tight mb-1.5">{item.name}</div>
            <div className="font-mono text-[9px] text-green tracking-[0.1em] uppercase">● CAT: {item.category.toUpperCase()}</div>
          </div>
        </div>

        <div className="px-5 grid grid-cols-2 gap-2.5">
          <DataField label="LAST_PAID" value={`${item.lastPrice.toFixed(2)} kCr`} sub={`DATE: ${item.lastDate}`} />
          <DataField label="LOWEST_VAL" value={`${item.lowestPrice.toFixed(2)} kCr`} valueColor="var(--green)" sub={`DATE: ${item.lowestDate}`} />
          <DataField label="FREQ_SOURCE" value={item.freqSource || 'N/A'} />
          <DataField label="INFLATION" value={item.deltaDir === 'up' ? `+${item.delta}%` : `${item.delta}%`} valueColor={item.deltaDir === 'up' ? 'var(--amber)' : 'var(--green)'} sub="YTD VARIANCE" />
        </div>

        <div className="mx-5 mt-4 bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
          <div className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand px-3.5 py-2.5 border-b border-border-custom">// PRICE_TRAJECTORY_ANALYSIS //</div>
          {points.length > 0 ? (
            <>
              <div className="bg-hull p-3">
                <svg width="100%" viewBox="0 0 310 140" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#78A890" stopOpacity="0.18" /><stop offset="100%" stopColor="#78A890" stopOpacity="0" /></linearGradient>
                    <pattern id="dotgrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.8" fill="#36312D" /></pattern>
                  </defs>
                  <rect width="310" height="140" fill="url(#dotgrid)" />
                  <line x1="0" y1="30" x2="310" y2="30" stroke="#36312D" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="70" x2="310" y2="70" stroke="#36312D" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="110" x2="310" y2="110" stroke="#36312D" strokeWidth="1" strokeDasharray="4 4" />
                  <path d={fillD} fill="url(#chartFill)" />
                  <path d={pathD} fill="none" stroke="#78A890" strokeWidth="2" strokeLinecap="round" filter="url(#glow)" />
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 3.5} fill={i === points.length - 1 ? '#D98C45' : '#78A890'} stroke={i === points.length - 1 ? '#F5F2E8' : 'none'} strokeWidth={i === points.length - 1 ? 1.5 : 0} filter="url(#glow)" />
                  ))}
                  {points.map((p, i) => (
                    <text key={`l-${i}`} x={p.x - 8} y={132} fontFamily="JetBrains Mono, monospace" fontSize="8" fill={i === points.length - 1 ? '#D98C45' : '#A09687'}>{p.month}</text>
                  ))}
                </svg>
              </div>
              <div className="flex border-t border-border-custom">
                {['3M', '6M', '1Y'].map(period => (
                  <button key={period} onClick={() => setChartPeriod(period)} className={`flex-1 font-mono text-[11px] font-bold tracking-[0.1em] uppercase py-2 cursor-pointer border border-border-custom transition-all ${chartPeriod === period ? 'text-amber border-amber border-b-[3px] bg-amber/8' : 'text-sand bg-transparent hover:text-cream'}`}>{period}</button>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-hull p-6 text-center">
              <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-sand">NO_PRICE_HISTORY</div>
            </div>
          )}
        </div>

        <div className="px-5 pt-4">
          <SectionLabel>// RECENT_RECEIPTS //</SectionLabel>
          {recentReceipts.length > 0 ? (
            <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
              {recentReceipts.map((rcpt, i) => (
                <Link key={i} href={`/receipts/${rcpt.id}`} className="no-underline">
                  <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border-custom last:border-b-0 cursor-pointer hover:bg-panel2 transition-colors">
                    <div className="w-[34px] h-[34px] flex-shrink-0 rounded-lg bg-hull border border-border-custom flex items-center justify-center text-base">🏪</div>
                    <div className="flex-1">
                      <div className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream mb-0.5">{rcpt.merchant}</div>
                      <div className="font-mono text-[9px] text-sand tracking-wider">{rcpt.date} · #{rcpt.id.slice(0, 8)}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-heading text-[13px] font-bold text-cream block">{rcpt.price.toFixed(2)}</span>
                      <span className="font-mono text-[8px] text-sand">kCr</span>
                    </div>
                    <span className={`font-mono text-[8px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm border ${tagStyles[rcpt.tag] || tagStyles.NORMAL}`}>{rcpt.tag}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-panel border-2 border-border-custom rounded-xl p-6 text-center">
              <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-sand">NO_RECEIPTS_FOUND</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
