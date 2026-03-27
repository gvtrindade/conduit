'use client';

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import TopNav from '@/components/top-nav';
import Badge from '@/components/badge';
import SectionLabel from '@/components/section-label';
import {
  MANIFEST_DETAIL_QUERY,
  MANIFEST_ITEMS_QUERY,
  MANIFEST_CREW_QUERY,
  mapDbManifestDetailToManifest,
  mapDbManifestItemToManifestItem,
  mapDbCrewToCrewMember,
  type DbManifestDetailRow,
  type DbManifestItemRow,
  type DbManifestCrewRow,
} from '@/lib/manifest-queries';

export default function ManifestDetailClient({ id }: { id: string }) {
  const { data: rawManifest, isLoading: manifestLoading } = useQuery(MANIFEST_DETAIL_QUERY, [id]);
  const { data: rawItems, isLoading: itemsLoading } = useQuery(MANIFEST_ITEMS_QUERY, [id]);
  const { data: rawCrew, isLoading: crewLoading } = useQuery(MANIFEST_CREW_QUERY, [id]);

  const isLoading = manifestLoading || itemsLoading || crewLoading;

  const mft = useMemo(() => {
    const rows = rawManifest as unknown as DbManifestDetailRow[];
    if (!rows || rows.length === 0) return null;
    const items = (rawItems as unknown as DbManifestItemRow[] || []).map(mapDbManifestItemToManifestItem);
    const crew = (rawCrew as unknown as DbManifestCrewRow[] || []).map(mapDbCrewToCrewMember);
    return mapDbManifestDetailToManifest(rows[0], items, crew);
  }, [rawManifest, rawItems, rawCrew]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">LOADING_MANIFEST</div>
          <div className="font-mono text-[10px] text-panel2">Fetching manifest data...</div>
        </div>
      </div>
    );
  }

  if (!mft) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl opacity-40 mb-3">⊘</div>
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">MANIFEST_NOT_FOUND</div>
          <div className="text-xs text-panel2">Manifest #{id} does not exist.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <TopNav
        backHref="/manifests"
        backLabel="MANIFEST_REGISTRY"
        title={mft.title}
      />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-6">
        <div className="px-5 py-3 border-b border-border-custom">
          <div className="font-mono text-[9px] text-sand tracking-[0.16em] uppercase mb-1">// PRE-FLIGHT MANIFEST //</div>
          <div className="font-tight text-[22px] font-bold text-cream uppercase tracking-[0.06em] mb-3">{mft.title}</div>
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="font-mono text-[10px] text-sand tracking-[0.1em] uppercase">EST_TOTAL:</span>
            <span className="font-heading text-2xl font-bold text-cream">{mft.estTotal.toFixed(2)}</span>
            <span className="font-mono text-sm text-sand">kCr</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[9px] text-sand tracking-[0.1em] uppercase whitespace-nowrap">COMP_LVL:</span>
            <div className="flex items-center gap-1.5 flex-1">
              <div className="flex-1 h-2 bg-hull border border-border-custom rounded-sm overflow-hidden">
                <div className="h-full w-4/5 bg-gradient-to-r from-green to-green/50 rounded-sm" />
              </div>
              <span className="font-mono text-[9px] text-amber">{mft.confidence}</span>
            </div>
          </div>
          <button
            className="w-full bg-amber border-2 border-[#C07830] rounded-lg py-3 font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-hull cursor-pointer mt-3 hover:opacity-90 transition-opacity"
            style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.4), 0 0 20px rgba(217,140,69,0.3)' }}
          >
            [[ INITIATE_SHOPPING_PROTOCOL ]]
          </button>
        </div>

        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="font-mono text-[9px] font-bold tracking-[0.18em] uppercase text-sand border-b border-border-custom pb-1.5 flex-1">
            // MANIFEST_ITEMS // {mft.items.length} ASSIGNED
          </div>
          <button className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-blue bg-blue/8 border-[1.5px] border-blue/35 rounded-md px-2.5 py-1 cursor-pointer hover:border-blue hover:bg-blue/14 transition-all ml-2 flex items-center gap-1">
            <span className="text-xs">＋</span> ADD_ITEM
          </button>
        </div>

        <div className="px-5 flex flex-col gap-2">
          {mft.items.map((item, i) => (
            <div key={i} className={`bg-panel border border-border-custom rounded-lg px-3.5 py-3 flex items-center gap-3 ${item.checked ? 'opacity-65' : ''} ${item.unknown ? 'border-amber/30' : ''}`}>
              <div className={`w-[22px] h-[22px] flex-shrink-0 border-2 rounded-sm bg-hull flex items-center justify-center font-mono text-sm font-bold text-green cursor-pointer ${item.checked ? 'border-green' : item.unknown ? 'border-amber' : 'border-border-custom'}`}>
                {item.checked && '✕'}
              </div>
              <div className="flex-1">
                <div className={`text-[13px] font-semibold uppercase tracking-[0.04em] ${item.checked ? 'text-sand' : 'text-cream'}`}>{item.name}</div>
              </div>
              {item.unknown ? (
                <Badge variant="amber">NO_DATA</Badge>
              ) : item.prevPrice !== null ? (
                <div className="font-mono text-[9px] font-bold tracking-[0.08em] uppercase text-blue bg-blue/10 border border-blue/25 rounded-full px-2 py-0.5 whitespace-nowrap">
                  PREV: {item.prevPrice.toFixed(2)} kCr
                </div>
              ) : item.location ? (
                <div className="font-mono text-[9px] font-bold tracking-[0.08em] uppercase text-blue bg-blue/10 border border-blue/25 rounded-full px-2 py-0.5 whitespace-nowrap">
                  LOC: {item.location}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="px-5 pt-4">
          <SectionLabel right={`${mft.crew.length} OPERATORS`}>// MISSION_CREW //</SectionLabel>
          <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden mb-2.5">
            {mft.crew.map((member, i) => (
              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border-custom last:border-b-0">
                <div className="w-9 h-9 flex-shrink-0 rounded-full border-2 border-cream bg-panel2 flex items-center justify-center font-mono text-[11px] font-bold text-cream" style={{ background: member.color }}>{member.initials}</div>
                <div className="flex-1">
                  <div className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream mb-0.5">{member.name}</div>
                  <div className="font-mono text-[9px] text-sand tracking-wider">{member.role}</div>
                </div>
                <Badge variant={member.badge === 'COMMANDER' ? 'green' : 'sand'}>{member.badge}</Badge>
              </div>
            ))}
          </div>
          <button className="w-full bg-transparent border-[1.5px] border-dashed border-amber/35 rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer hover:border-amber hover:bg-amber/5 transition-all">
            <span className="font-mono text-base">＋</span>
            <span className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-amber">// INCLUDE_OPERATOR //</span>
          </button>
        </div>
      </div>
    </div>
  );
}
