'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useQuery, usePowerSync } from '@powersync/react';
import SectionLabel from '@/components/section-label';
import Toast, { useToast } from '@/components/toast';
import ModalOverlay, { ModalHeader, ModalBody } from '@/components/modal-overlay';
import ItemForm, { type ItemFormData, type Category, type Tag } from '@/components/item-form';
import { authClient } from '@/lib/auth-client';
import { createItem } from '@/lib/item-mutations';
import { ITEMS_WITH_JOINS_QUERY, mapDbItemToItem, type DbItemRow } from '@/lib/item-queries';
import type { Item } from '@/lib/types';

const catLabels: Record<string, string> = {
  all: 'ALL',
  produce: '🥦 PRODUCE',
  dairy: '🥛 DAIRY',
  protein: '🥩 PROTEIN',
  pantry: '🫙 PANTRY',
  house: '🏠 HOUSE',
  bev: '🧃 BEVER.',
};

const alertColors: Record<string, string> = {
  spike: 'border-l-[3px] border-l-red',
  drop: 'border-l-[3px] border-l-green',
  watch: 'border-l-[3px] border-l-amber',
};

const deltaColors: Record<string, string> = {
  up: 'text-red',
  down: 'text-green',
  flat: 'text-sand',
};

const deltaArrow: Record<string, string> = {
  up: '▲',
  down: '▼',
  flat: '●',
};

export default function ItemsPage() {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [showNewItem, setShowNewItem] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const powerSync = usePowerSync();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? null;

  const { data: rawItems, isLoading } = useQuery(ITEMS_WITH_JOINS_QUERY);
  const { data: categories } = useQuery("SELECT * FROM categories");
  const { data: tags } = useQuery("SELECT * FROM tags");

  const baseCurrency = "kCr";

  const items: Item[] = useMemo(
    () => (rawItems as unknown as DbItemRow[]).map(mapDbItemToItem),
    [rawItems]
  );

  const filteredItems = items.filter(item => {
    // TODO: improve search method
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.codename.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCat === 'all' || item.category.toLocaleLowerCase() === activeCat;
    return matchSearch && matchCat;
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">SYNCING_DATA</div>
          <div className="font-mono text-[10px] text-panel2">Loading items from local store...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Sticky Header */}
        <div className="sticky top-0 z-60 bg-hull border-b border-border-custom">
          {/* Search */}
          <div className="px-5 py-2.5 flex gap-2 items-center">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-sand pointer-events-none">🔍</span>
              <input
                className="w-full bg-panel border-[1.5px] border-border-custom rounded-lg py-2.5 pl-9 pr-3 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
                placeholder="SEARCH_RESOURCE_ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex px-5 pb-2.5 gap-0 overflow-x-auto scrollbar-none">
            {Object.entries(catLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCat(key)}
                className={`font-mono text-[9px] font-bold tracking-[0.1em] uppercase px-3 py-1.5 cursor-pointer whitespace-nowrap transition-all border border-border-custom ${
                  activeCat === key
                    ? 'text-amber border-amber bg-amber/8'
                    : 'text-sand hover:text-cream hover:bg-panel'
                } ${key === 'all' ? 'rounded-l-md' : ''} ${key === 'bev' ? 'rounded-r-md' : ''} ${key !== 'all' ? 'border-l-0' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mx-5 mt-3 flex items-center bg-panel border border-border-custom rounded-xl overflow-hidden">
          <div className="flex-1 py-2.5 text-center border-r border-border-custom">
            <span className="font-heading text-[17px] font-bold text-cream block leading-none">{filteredItems.length}</span>
            <span className="font-mono text-[8px] tracking-widest uppercase text-sand block mt-1">TRACKED</span>
          </div>
          <div className="flex-1 py-2.5 text-center border-r border-border-custom">
            <span className="font-heading text-[17px] font-bold text-red block leading-none">{filteredItems.filter(i => i.alert === 'spike').length}</span>
            <span className="font-mono text-[8px] tracking-widest uppercase text-sand block mt-1">SPIKES</span>
          </div>
          <div className="flex-1 py-2.5 text-center">
            <span className="font-heading text-[17px] font-bold text-green block leading-none">{filteredItems.filter(i => i.alert === 'drop').length}</span>
            <span className="font-mono text-[8px] tracking-widest uppercase text-sand block mt-1">DROPS</span>
          </div>
        </div>

        {/* Item List */}
        <div className="px-5 pt-4">
          <SectionLabel right={`${filteredItems.length} ITEMS`}>// RESOURCE_MANIFEST //</SectionLabel>
          {filteredItems.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filteredItems.map(item => (
                <Link key={item.id} href={`/items/${item.id}`} className="no-underline">
                  <div className={`bg-panel border-[1.5px] border-border-custom rounded-xl overflow-hidden cursor-pointer hover:border-sand transition-colors relative ${item.alert ? alertColors[item.alert] : ''}`}>
                    <div className="flex items-center gap-3 p-3.5">
                      {/* Item Icon */}
                      <div className="w-10 h-10 rounded-xl bg-hull border border-border-custom flex items-center justify-center text-xl flex-shrink-0 relative">
                        {item.emoji}
                        <div className="absolute inset-0 rounded-xl" style={{
                          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.35) 1px, transparent 1px)',
                          backgroundSize: '3px 3px',
                        }} />
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[8px] font-bold tracking-[0.1em] uppercase text-sand mb-0.5">{item.codename}</div>
                        <div className="text-sm font-semibold text-cream truncate mb-1">{item.name}</div>
                        <div className="flex gap-1 flex-wrap">
                          {item.tags?.map((tag: string) => (
                            <span key={tag} className={`font-mono text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm border ${
                              tag === 'ORGANIC' || tag === 'DEAL' ? 'text-green border-green/35 bg-green/8' :
                              tag === 'SPIKE' ? 'text-red border-red/35 bg-red/8' :
                              tag === 'WATCH' ? 'text-amber border-amber/35 bg-amber/8' :
                              'text-sand border-border-custom bg-sand/6'
                            }`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <span className={`font-heading text-[17px] font-bold block leading-none ${
                          item.alert === 'spike' ? 'text-red' : item.alert === 'drop' ? 'text-green' : item.alert === 'watch' ? 'text-amber' : 'text-cream'
                        }`}>
                          {item.lastPrice?.toFixed(2)}
                        </span>
                        <span className="font-mono text-[8px] text-sand block mt-0.5">{baseCurrency} / {item.unit}</span>
                        <span className={`font-mono text-[10px] font-bold block mt-1 ${deltaColors[item.deltaDir]}`}>
                          {deltaArrow[item.deltaDir]} {item.deltaDir === 'flat' ? '+' : ''}{Math.abs(item.delta)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="text-4xl opacity-40 mb-3">⊘</div>
              <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">NO_RESOURCES_FOUND</div>
              <div className="text-xs text-panel2">Waiting for initial sync or try a different filter.</div>
            </div>
          )}
        </div>

        {filteredItems.length === 0 && items.length > 0 && (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl opacity-40 mb-3">⊘</div>
            <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">NO_RESOURCES_FOUND</div>
            <div className="text-xs text-panel2">Try a different search query or category filter.</div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNewItem(true)}
        className="fixed bottom-20 right-5 w-12 h-12 rounded-xl bg-amber border-2 border-[#C07830] flex items-center justify-center text-xl cursor-pointer z-50 text-hull hover:opacity-90 transition-opacity"
        style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.3), 0 0 20px rgba(217,140,69,0.3)' }}
      >
        ＋
      </button>

      {/* New Item Modal */}
      <ModalOverlay show={showNewItem} onClose={() => setShowNewItem(false)}>
        <ModalHeader title="// NEW_ITEM //" onClose={() => setShowNewItem(false)} />
        <ModalBody>
          <ItemForm
            mode="create"
            categories={categories?.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) ?? []}
            tags={tags?.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })) ?? []}
            onSubmit={async (data: ItemFormData) => {
              const now = new Date().toISOString();
              await createItem(powerSync, {
                name: data.name,
                codename: data.codename || null,
                code: null,
                emoji: data.emoji || null,
                category_id: data.category,
                category_custom: data.category_custom || null,
                primary_tag_id: data.primary_tag_id || null,
                primary_tag_custom: data.primary_tag_custom || null,
                unit: data.unit || null,
                last_price: null,
                last_price_date: null,
                lowest_price: null,
                lowest_price_date: null,
                freq_source_id: null,
                created_at: now,
                updated_at: now,
                user_id: userId,
              });
              showToast('✦', 'ITEM_CREATED');
              setShowNewItem(false);
            }}
            onCancel={() => setShowNewItem(false)}
          />
        </ModalBody>
      </ModalOverlay>

      <Toast icon={toast.icon} message={toast.message} visible={toast.visible} onClose={hideToast} />
    </div>
  );
}
