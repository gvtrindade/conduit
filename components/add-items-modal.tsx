'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, usePowerSync } from '@powersync/react';
import ModalOverlay, { ModalHeader, ModalBody } from './modal-overlay';
import { ITEMS_WITH_JOINS_QUERY, mapDbItemToItem, type DbItemRow } from '@/lib/item-queries';
import { addManifestItem } from '@/lib/manifest-mutations';

interface LocalItem {
  id: string;
  name: string;
}

interface AddItemsModalProps {
  show: boolean;
  manifestId: string;
  existingItemIds?: Set<string>;
  onClose: () => void;
  onItemsAdded: () => void;
}

export default function AddItemsModal({ show, manifestId, existingItemIds, onClose, onItemsAdded }: AddItemsModalProps) {
  const powerSync = usePowerSync();
  const { data: rawItems, isLoading } = useQuery(ITEMS_WITH_JOINS_QUERY);

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localItems, setLocalItems] = useState<LocalItem[]>([]);

  useEffect(() => {
    if (!show) {
      setLocalItems([]);
    }
  }, [show]);

  const items = useMemo(
    () => (rawItems as unknown as DbItemRow[] || []).map(mapDbItemToItem),
    [rawItems]
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (existingItemIds?.has(item.id)) return false;
        if (!search) return true;
        return (
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.category.toLowerCase().includes(search.toLowerCase())
        );
      }),
    [items, search, existingItemIds]
  );

  const displayItems = useMemo(() => {
    const localItemData = localItems.map((li) => ({
      id: li.id,
      name: li.name,
      category: '',
      lastPrice: 0,
      isLocal: true as const,
    }));
    return [...filteredItems, ...localItemData];
  }, [filteredItems, localItems]);

  const selectedItems = useMemo(() => {
    const allItems = [...items, ...localItems.map(li => ({
      id: li.id,
      name: li.name,
      category: '',
      lastPrice: 0,
      isLocal: true as const,
    }))];
    return allItems.filter(item => selectedIds.has(item.id));
  }, [items, localItems, selectedIds]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAdd = useCallback(async () => {
    setIsSubmitting(true);
    try {
      for (const id of selectedIds) {
        const item = items.find((i) => i.id === id);
        if (item) {
          await addManifestItem(powerSync, manifestId, {
            itemId: item.id,
            itemName: item.name,
            prevPrice: item.lastPrice || null,
            isUnknown: false,
          });
          continue;
        }
        const localItem = localItems.find((li) => li.id === id);
        if (localItem) {
          await addManifestItem(powerSync, manifestId, {
            itemName: localItem.name,
            isUnknown: true,
          });
        }
      }

      setSelectedIds(new Set());
      setSearch('');
      setLocalItems([]);
      onItemsAdded();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIds, items, localItems, search, powerSync, manifestId, onItemsAdded, onClose]);

  const hasSelection = selectedIds.size > 0;
  const selectedCount = selectedIds.size;

  const handleAddNewItem = useCallback(() => {
    if (!search.trim()) return;
    const newItem: LocalItem = {
      id: crypto.randomUUID(),
      name: search.trim().toUpperCase(),
    };
    setLocalItems((prev) => [...prev, newItem]);
    setSelectedIds((prev) => new Set(prev).add(newItem.id));
    setSearch('');
  }, [search]);

  const removeLocalItem = useCallback((id: string) => {
    setLocalItems((prev) => prev.filter((li) => li.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <ModalOverlay show={show} onClose={onClose}>
      <ModalHeader title="// ADD_ITEMS //" onClose={onClose} />
      <ModalBody>
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-sand pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH_CATALOG..."
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-2.5 pl-9 pr-3 font-mono text-xs text-cream outline-none focus:border-amber transition-colors placeholder:text-panel2"
            />
          </div>

          {/* Item list */}
          <div className="max-h-52 overflow-y-auto scrollbar-none bg-panel border-[1.5px] border-border-custom rounded-xl">
            {isLoading ? (
              <div className="px-3.5 py-4 text-center font-mono text-[9px] text-sand">
                LOADING_CATALOG...
              </div>
            ) : displayItems.length === 0 && !search.trim() ? (
              <div className="px-3.5 py-3 text-center">
                <span className="font-mono text-[9px] text-sand">NO_ITEMS_FOUND</span>
              </div>
            ) : (
              <>
                {displayItems.length > 0 && displayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={`w-full text-left px-3.5 py-2.5 border-b border-border-custom flex items-center gap-3 cursor-pointer transition-colors ${
                      selectedIds.has(item.id) ? 'bg-blue/8' : 'hover:bg-panel2'
                    }`}
                  >
                    <div
                      className={`w-[18px] h-[18px] flex-shrink-0 border-2 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                        selectedIds.has(item.id)
                          ? 'border-blue bg-blue text-hull'
                          : 'border-border-custom bg-hull'
                      }`}
                    >
                      {selectedIds.has(item.id) && '✓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-cream truncate">{item.name}</div>
                      {item.category && (
                        <div className="font-mono text-[9px] text-sand">{item.category}</div>
                      )}
                    </div>
                    {'isLocal' in item ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLocalItem(item.id);
                        }}
                        className="font-mono text-xs text-sand hover:text-red cursor-pointer transition-colors px-1"
                      >
                        ✕
                      </div>
                    ) : item.lastPrice > 0 ? (
                      <div className="font-mono text-[9px] font-bold text-blue whitespace-nowrap">
                        {item.lastPrice.toFixed(2)} kCr
                      </div>
                    ) : null}
                  </button>
                ))}
                {search.trim() && (
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    disabled={isSubmitting}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-panel2 font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-blue border-t border-blue/30"
                  >
                    ＋ ADD &ldquo;{search.trim().toUpperCase()}&rdquo;
                  </button>
                )}
              </>
            )}
          </div>

          {selectedCount > 0 && (
            <div className="bg-panel border-[1.5px] border-border-custom rounded-xl">
              <div className="px-3.5 py-2 font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-sand border-b border-border-custom">
                // SELECTED_ITEMS //
              </div>
              <div className="max-h-48 overflow-y-auto">
              {selectedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border-custom last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-cream truncate">{item.name}</div>
                    {item.category && (
                      <div className="font-mono text-[9px] text-sand">{item.category}</div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="font-mono text-xs text-sand hover:text-red cursor-pointer transition-colors px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              </div>
            </div>
          )}

          {/* Add button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!hasSelection || isSubmitting}
            className={`w-full border-2 rounded-lg py-3 font-mono text-[11px] font-bold tracking-[0.12em] uppercase cursor-pointer transition-all ${
              hasSelection && !isSubmitting
                ? 'bg-blue border-[#2B6CB0] text-hull hover:opacity-90'
                : 'bg-panel border-border-custom text-panel2 cursor-not-allowed'
            }`}
            style={
              hasSelection && !isSubmitting
                ? { boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.3), 0 0 20px rgba(66,153,225,0.3)' }
                : undefined
            }
          >
            {isSubmitting ? 'ADDING...' : selectedCount > 0 ? `[[ ADD_SELECTED (${selectedCount}) ]]` : '[[ ADD_ITEMS ]]'}
          </button>
        </div>
      </ModalBody>
    </ModalOverlay>
  );
}
