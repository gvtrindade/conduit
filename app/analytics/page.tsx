'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@powersync/react';
import Badge from '@/components/badge';
import SectionLabel from '@/components/section-label';
import KpiBox from '@/components/kpi-box';
import {
  KPI_QUERY,
  ITEMS_TRACKED_QUERY,
  CATEGORY_SPEND_QUERY,
  MERCHANT_RANKINGS_QUERY,
  mapDbKpiToKpis,
  mapDbCategoryToCategorySpend,
  mapDbMerchantToMerchantRank,
  type DbKpiRow,
  type DbItemsTrackedRow,
  type DbCategorySpendRow,
  type DbMerchantRankRow,
} from '@/lib/analytics-queries';


const DEFAULT_BUDGET = 5000;

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30D');

  const { data: rawKpi, isLoading: kpiLoading } = useQuery(KPI_QUERY);
  const { data: rawItemsTracked, isLoading: itemsLoading } = useQuery(ITEMS_TRACKED_QUERY);
  const { data: rawCategorySpend, isLoading: categoryLoading } = useQuery(CATEGORY_SPEND_QUERY);
  const { data: rawMerchantRankings, isLoading: merchantLoading } = useQuery(MERCHANT_RANKINGS_QUERY);

  const isLoading = kpiLoading || itemsLoading || categoryLoading || merchantLoading;

  const { kpis, totalSpend, categorySpend, merchants } = useMemo(() => {
    const kpiRow = (rawKpi as unknown as DbKpiRow[])[0];
    const itemsRow = (rawItemsTracked as unknown as DbItemsTrackedRow[])[0];
    const totalSpend = kpiRow ? Math.round(kpiRow.total_spend) : 0;
    const itemsTracked = itemsRow ? itemsRow.items_tracked : 0;
    const kpis = kpiRow ? mapDbKpiToKpis(kpiRow, itemsTracked) : [];
    const categorySpend = (rawCategorySpend as unknown as DbCategorySpendRow[]).map(row =>
      mapDbCategoryToCategorySpend(row, totalSpend)
    );
    const merchants = (rawMerchantRankings as unknown as DbMerchantRankRow[]).map(
      mapDbMerchantToMerchantRank
    );
    return { kpis, totalSpend, categorySpend, merchants };
  }, [rawKpi, rawItemsTracked, rawCategorySpend, rawMerchantRankings]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">SYNCING_DATA</div>
          <div className="font-mono text-[10px] text-panel2">Loading analytics from local store...</div>
        </div>
      </div>
    );
  }

  const hasData = totalSpend > 0;

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border-custom flex items-center justify-between">
          <div className="font-heading text-[13px] font-bold tracking-[0.12em] uppercase text-amber">
            [ ANALYTICS <span className="text-sand font-normal">//</span> INTEL ]
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="amber">LIVE</Badge>
            <span className="font-mono text-[10px] text-sand tracking-wider uppercase">SYNCED</span>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex px-3.5 py-2.5 gap-1.5 border-b border-border-custom bg-hull">
          {['7D', '30D', '90D', 'YTD'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`font-mono text-[9px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded border cursor-pointer transition-all ${
                period === p
                  ? 'text-amber border-amber bg-amber/8'
                  : 'text-sand border-border-custom bg-transparent hover:text-cream'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {!hasData ? (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl opacity-40 mb-3">📊</div>
            <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">NO_DATA_YET</div>
            <div className="text-xs text-panel2">Register receipts to see analytics.</div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="px-5 pt-3.5">
              <SectionLabel>// MISSION_METRICS //</SectionLabel>
              <div className="flex gap-2">
                {kpis.map(kpi => (
                  <KpiBox
                    key={kpi.label}
                    label={kpi.label}
                    value={kpi.value}
                    delta={kpi.delta}
                    deltaType={kpi.deltaType}
                  />
                ))}
              </div>
            </div>

            {/* Expenditure Chart */}
            <div className="px-5 pt-4 pb-3.5">
              <SectionLabel>// EXPENDITURE_TRAJECTORY //</SectionLabel>
              <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
                <div className="bg-hull px-3.5 py-2.5 border-b border-border-custom flex justify-between items-center">
                  <span className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand">WEEKLY_OUTLAY // kCr</span>
                  <span className="font-mono text-[9px] text-green">▼ TREND_OK</span>
                </div>
                <div className="bg-hull p-3">
                  <svg width="100%" viewBox="0 0 310 120" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#78A890" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#78A890" stopOpacity="0.3" />
                      </linearGradient>
                      <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D98C45" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#D98C45" stopOpacity="0.3" />
                      </linearGradient>
                      <pattern id="dg2" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="0.8" fill="#36312D" />
                      </pattern>
                    </defs>
                    <rect width="310" height="105" fill="url(#dg2)" />
                    <line x1="0" y1="26" x2="310" y2="26" stroke="#36312D" strokeWidth="1" strokeDasharray="4 3" />
                    <line x1="0" y1="52" x2="310" y2="52" stroke="#36312D" strokeWidth="1" strokeDasharray="4 3" />
                    <line x1="0" y1="78" x2="310" y2="78" stroke="#36312D" strokeWidth="1" strokeDasharray="4 3" />
                    <text x="2" y="24" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#A09687">1200</text>
                    <text x="2" y="50" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#A09687">900</text>
                    <text x="2" y="76" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#A09687">600</text>
                    {/* Bars */}
                    <rect x="34" y="52" width="16" height="52" rx="2" fill="url(#barGrad1)" />
                    <rect x="76" y="38" width="16" height="66" rx="2" fill="url(#barGrad1)" />
                    <rect x="118" y="14" width="16" height="90" rx="2" fill="url(#barGrad2)" />
                    <rect x="160" y="50" width="16" height="54" rx="2" fill="url(#barGrad1)" />
                    <rect x="202" y="44" width="16" height="60" rx="2" fill="url(#barGrad1)" opacity="0.6" />
                    {/* Labels */}
                    <text x="30" y="116" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#A09687">W38</text>
                    <text x="72" y="116" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#A09687">W39</text>
                    <text x="114" y="116" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#D98C45">W40</text>
                    <text x="156" y="116" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#A09687">W41</text>
                    <text x="198" y="116" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#78A890">W42▸</text>
                    {/* Legend */}
                    <rect x="240" y="8" width="8" height="8" rx="1" fill="url(#barGrad1)" />
                    <text x="252" y="15" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#A09687">ACTUAL</text>
                    <rect x="240" y="22" width="8" height="8" rx="1" fill="none" stroke="#5B8A9E" strokeWidth="1" strokeDasharray="2 1" />
                    <text x="252" y="29" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#A09687">BUDGET</text>
                  </svg>
                </div>
                {/* Budget Gauge */}
                <div className="bg-hull px-3.5 py-3 border-t border-border-custom">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-sand">BUDGET_UTILIZATION</span>
                    <span className="font-heading text-[11px] text-cream">{totalSpend.toLocaleString()} <span className="text-sand">/</span> {DEFAULT_BUDGET.toLocaleString()} kCr</span>
                  </div>
                  <div className="h-2.5 bg-panel border border-border-custom rounded-sm overflow-hidden relative mb-1.5">
                    <div className="h-full rounded-sm bg-gradient-to-r from-green via-amber to-red" style={{ width: `${Math.min((totalSpend / DEFAULT_BUDGET) * 100, 100)}%` }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-cream/40" style={{ left: '80%' }} />
                  </div>
                  <div className="flex justify-between font-mono text-[8px] text-sand tracking-wider">
                    <span>0 kCr</span>
                    <span>WARN_THRESHOLD: 80%</span>
                    <span className="text-amber">{((totalSpend / DEFAULT_BUDGET) * 100).toFixed(1)}% CONSUMED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Allocation */}
            <div className="px-5 pb-3.5">
              <SectionLabel>// CATEGORY_ALLOCATION //</SectionLabel>
              {categorySpend.length > 0 ? (
                <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
                  {categorySpend.map((cat, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-custom last:border-b-0">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0" style={{ background: `${cat.color}12` }}>
                        {cat.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="font-mono text-[10px] font-bold tracking-[0.08em] uppercase text-cream mb-1">{cat.name}</div>
                        <div className="h-[5px] bg-hull rounded-sm overflow-hidden">
                          <div className="h-full rounded-sm" style={{ width: `${cat.pct}%`, background: cat.color }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading text-[13px] font-bold text-cream whitespace-nowrap">{cat.amount.toLocaleString()}</div>
                        <div className="font-mono text-[9px] text-sand">{cat.pct}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-panel border-2 border-border-custom rounded-xl p-6 text-center">
                  <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-sand">NO_CATEGORY_DATA</div>
                </div>
              )}
            </div>

            {/* Top Merchants */}
            <div className="px-5 pb-3.5">
              <SectionLabel>// TOP_SUPPLY_STATIONS //</SectionLabel>
              {merchants.length > 0 ? (
                <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
                  {merchants.map((m, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3.5 py-2 border-b border-border-custom last:border-b-0">
                      <span className="font-mono text-[11px] font-bold w-[18px]" style={{ color: m.color || 'var(--sand)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream flex-1">{m.name}</span>
                      <span className="font-mono text-[9px] text-sand mr-2.5">{m.visits} ops</span>
                      <span className="font-heading text-xs font-bold text-cream">{m.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-panel border-2 border-border-custom rounded-xl p-6 text-center">
                  <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-sand">NO_MERCHANT_DATA</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
