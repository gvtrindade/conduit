'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, usePowerSync } from '@powersync/react';
import ModalOverlay, { ModalHeader, ModalBody } from './modal-overlay';
import Toast, { useToast } from './toast';
import {
  addManifestItem,
  createCatalogItem,
  deleteCatalogItem,
  updateCatalogItem,
} from '@/lib/manifest-mutations';
import {
  CATALOG_ITEMS_QUERY,
  MERCHANT_CATEGORIES_QUERY,
  mapDbCatalogItem,
  type DbCatalogItemRow,
} from '@/lib/manifest-queries';

interface AddItemsModalProps {
  show: boolean;
  manifestId: string;
  userId: string | null;
  onClose: () => void;
  onItemsAdded: () => void;
}

export default function AddItemsModal({ show, manifestId, userId, onClose, onItemsAdded }: AddItemsModalProps) {
  const powerSync = usePowerSync();
  const { toast, showToast, hideToast } = useToast();
  const { data: rawItems, isLoading } = useQuery(CATALOG_ITEMS_QUERY, [userId ?? '']);

  // Registered aisles (distinct categories across the user's merchants) — the
  // only allowed values for a catalog item's category.
  const { data: rawCategories } = useQuery(MERCHANT_CATEGORIES_QUERY, [userId ?? '']);
  const registeredCategories = useMemo(
    () => ((rawCategories as unknown as { category: string }[]) || []).map((r) => r.category),
    [rawCategories],
  );

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingNewItemName, setPendingNewItemName] = useState<string | null>(null);
  const [newItemCategory, setNewItemCategory] = useState('');

  // Inline edit / delete of existing catalog items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [editingItemCategory, setEditingItemCategory] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const items = useMemo(
    () => ((rawItems as unknown as DbCatalogItemRow[]) || []).map(mapDbCatalogItem),
    [rawItems]
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (!search) return true;
        return (
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          (item.category && item.category.toLowerCase().includes(search.toLowerCase()))
        );
      }),
    [items, search]
  );

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const toggleItem = useCallback((id: string) => {
    // Don't allow toggling items currently being edited/deleted.
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

  // Propose new catalog item
  const handleProposeNewItem = useCallback(() => {
    if (!search.trim()) return;
    setPendingNewItemName(search.trim().toUpperCase());
    setNewItemCategory('');
    setSearch('');
  }, [search]);

  const cancelNewItem = useCallback(() => {
    setPendingNewItemName(null);
    setNewItemCategory('');
  }, []);

  // Category is valid only if empty (→ null) OR an exact registered aisle.
  const isNewItemCategoryValid =
    newItemCategory.trim() === '' ||
    registeredCategories.includes(newItemCategory.trim());

  const handleConfirmNewItem = useCallback(async () => {
    if (!pendingNewItemName || !userId || !isNewItemCategoryValid) return;
    setIsSubmitting(true);
    try {
      const catalogId = await createCatalogItem(powerSync, userId, {
        name: pendingNewItemName,
        category: newItemCategory.trim() || null,
      });
      setSelectedIds((prev) => new Set(prev).add(catalogId));
      setPendingNewItemName(null);
      setNewItemCategory('');
      showToast('✓', 'CATALOG_ITEM_CREATED');
    } catch {
      showToast('⊗', 'FAILED_TO_CREATE_ITEM');
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingNewItemName, newItemCategory, userId, powerSync, isNewItemCategoryValid, showToast]);

  const handleAdd = useCallback(async () => {
    setIsSubmitting(true);
    try {
      for (const id of selectedIds) {
        const item = items.find((i) => i.id === id);
        if (item) {
          await addManifestItem(powerSync, manifestId, {
            manifestItemId: item.id,
            name: item.name,
            category: item.category,
            estimated_cost: '0',
          });
        }
      }

      setSelectedIds(new Set());
      setSearch('');
      onItemsAdded();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIds, items, powerSync, manifestId, onItemsAdded, onClose]);

  // ── Edit existing catalog item ──
  const startEditItem = useCallback((item: { id: string; name: string; category: string | null }) => {
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingItemCategory(item.category ?? '');
    // Editing an item is incompatible with selecting it for manifest add.
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  }, []);

  const cancelEditItem = useCallback(() => {
    setEditingItemId(null);
    setEditingItemName('');
    setEditingItemCategory('');
  }, []);

  const isEditingItemCategoryValid =
    editingItemCategory.trim() === '' ||
    registeredCategories.includes(editingItemCategory.trim());

  const handleSaveEditItem = useCallback(async () => {
    if (!editingItemId || !userId || !isEditingItemCategoryValid) return;
    if (!editingItemName.trim()) return;
    setIsSavingEdit(true);
    try {
      await updateCatalogItem(powerSync, editingItemId, userId, {
        name: editingItemName.trim().toUpperCase(),
        category: editingItemCategory.trim() || null,
      });
      showToast('✓', 'CATALOG_ITEM_UPDATED');
      cancelEditItem();
    } catch {
      showToast('⊗', 'FAILED_TO_UPDATE_ITEM');
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingItemId, editingItemName, editingItemCategory, userId, powerSync, isEditingItemCategoryValid, showToast, cancelEditItem]);

  const handleDeleteItem = useCallback(async (itemId: string, name: string) => {
    if (!userId) return;
    const confirmed = window.confirm(
      `Delete catalog item "${name}"? This cannot be undone, and any manifest items referencing it will keep their last-saved values.`,
    );
    if (!confirmed) return;
    setDeletingItemId(itemId);
    try {
      await deleteCatalogItem(powerSync, itemId, userId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      showToast('✓', 'CATALOG_ITEM_DELETED');
      if (editingItemId === itemId) cancelEditItem();
    } catch {
      showToast('⊗', 'FAILED_TO_DELETE_ITEM');
    } finally {
      setDeletingItemId(null);
    }
  }, [userId, powerSync, showToast, editingItemId, cancelEditItem]);

  const hasSelection = selectedIds.size > 0;
  const selectedCount = selectedIds.size;

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

          {/* New-item category form */}
          {pendingNewItemName && (
            <div className="bg-panel border-[1.5px] border-amber/40 rounded-xl p-3 relative">
              <div className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-amber mb-2">
                // NEW_CATALOG_ITEM //
              </div>
              <div className="font-mono text-sm font-bold text-cream mb-2">
                {pendingNewItemName}
              </div>

              {/* Category picker — must come from registered aisles */}
              <CategoryPicker
                value={newItemCategory}
                onChange={setNewItemCategory}
                registeredCategories={registeredCategories}
                onValidityChange={() => {}}
              />
              {!isNewItemCategoryValid && (
                <div className="font-mono text-[8px] text-red tracking-[0.08em] uppercase mb-2">
                  ⚠ NOT_A_REGISTERED_AISLE — SELECT FROM LIST
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelNewItem}
                  className="flex-1 py-2 border border-border-custom rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNewItem}
                  disabled={isSubmitting || !userId || !isNewItemCategoryValid}
                  className="flex-1 py-2 bg-amber border border-[#C07830] rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-hull cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'CREATING...' : 'CONFIRM'}
                </button>
              </div>
            </div>
          )}

          {/* Item list */}
          <div className="max-h-64 overflow-y-auto scrollbar-none bg-panel border-[1.5px] border-border-custom rounded-xl">
            {isLoading ? (
              <div className="px-3.5 py-4 text-center font-mono text-[9px] text-sand">
                LOADING_CATALOG...
              </div>
            ) : filteredItems.length === 0 && !search.trim() && !pendingNewItemName ? (
              <div className="px-3.5 py-3 text-center">
                <span className="font-mono text-[9px] text-sand">NO_ITEMS_FOUND</span>
              </div>
            ) : (
              <>
                {filteredItems.map((item) =>
                  editingItemId === item.id ? (
                    <div
                      key={item.id}
                      className="px-3 py-3 border-b border-border-custom last:border-b-0 bg-amber/5 space-y-2"
                    >
                      <div className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-amber">
                        // EDIT_CATALOG_ITEM //
                      </div>
                      <input
                        type="text"
                        value={editingItemName}
                        onChange={(e) => setEditingItemName(e.target.value.toUpperCase())}
                        placeholder="ITEM_NAME"
                        className="w-full bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber placeholder:text-sand/40"
                        autoFocus
                      />
                      <CategoryPicker
                        value={editingItemCategory}
                        onChange={setEditingItemCategory}
                        registeredCategories={registeredCategories}
                        onValidityChange={() => {}}
                      />
                      {!isEditingItemCategoryValid && (
                        <div className="font-mono text-[8px] text-red tracking-[0.08em] uppercase">
                          ⚠ NOT_A_REGISTERED_AISLE — SELECT FROM LIST
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDeleteItem.bind(null, item.id, item.name)}
                          disabled={!!deletingItemId}
                          className="py-2 border border-red/40 rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-red hover:bg-red/10 transition-all cursor-pointer px-3 disabled:opacity-50"
                        >
                          {deletingItemId === item.id ? 'DEL...' : 'DELETE'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditItem}
                          className="flex-1 py-2 border border-border-custom rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
                        >
                          CANCEL
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEditItem}
                          disabled={
                            isSavingEdit ||
                            !editingItemName.trim() ||
                            !isEditingItemCategoryValid
                          }
                          className="flex-1 py-2 bg-amber border border-[#C07830] rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-hull cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                        >
                          {isSavingEdit ? 'SAVING...' : 'SAVE'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      className={`w-full text-left px-3.5 py-2.5 border-b border-border-custom flex items-center gap-2 transition-colors ${
                        selectedIds.has(item.id) ? 'bg-blue/8' : 'hover:bg-panel2'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer"
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
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditItem(item)}
                        className="font-mono text-[8px] text-blue border border-blue/30 rounded px-1.5 py-0.5 cursor-pointer hover:bg-blue/10 transition-colors flex-shrink-0"
                      >
                        EDIT
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        disabled={!!deletingItemId}
                        className="font-mono text-[8px] text-red border border-red/30 rounded px-1.5 py-0.5 cursor-pointer hover:bg-red/10 transition-colors flex-shrink-0 disabled:opacity-50"
                      >
                        DEL
                      </button>
                    </div>
                  ),
                )}
                {search.trim() && !pendingNewItemName && (
                  <button
                    type="button"
                    onClick={handleProposeNewItem}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-panel2 font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-blue border-t border-blue/30"
                  >
                    ＋ ADD &ldquo;{search.trim().toUpperCase()}&rdquo; TO_CATALOG
                  </button>
                )}
              </>
            )}
          </div>

          {selectedCount > 0 && (
            <div className="bg-panel border-[1.5px] border-border-custom rounded-xl">
              <div className="px-3.5 py-2 font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-sand border-b border-border-custom">
                {`// SELECTED (${selectedCount}) //`}
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
            {isSubmitting
              ? 'ADDING...'
              : selectedCount > 0
                ? `[[ ADD_SELECTED (${selectedCount}) ]]`
                : '[[ ADD_ITEMS ]]'}
          </button>
        </div>
      </ModalBody>

      <Toast
        icon={toast.icon}
        message={toast.message}
        visible={toast.visible}
        onClose={hideToast}
      />
    </ModalOverlay>
  );
}

// ─── Category picker ─────────────────────────────────────────────────────────
// A combobox constrained to the user's registered aisles (merchant_aisles
// categories). Typing filters the list; values must be picked from it (or left
// empty for "no category"). Free-text entries are flagged as invalid.
function CategoryPicker({
  value,
  onChange,
  registeredCategories,
  onValidityChange: _onValidityChange,
}: {
  value: string;
  onChange: (v: string) => void;
  registeredCategories: string[];
  onValidityChange?: (valid: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const v = value.trim().toUpperCase();
    if (!v) return registeredCategories;
    return registeredCategories.filter((c) => c.startsWith(v));
  }, [value, registeredCategories]);

  return (
    <div className="relative mb-2">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={registeredCategories.length === 0 ? 'NO_AISLES_REGISTERED' : 'SELECT_CATEGORY (OPTIONAL)'}
        disabled={registeredCategories.length === 0}
        className="w-full bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber placeholder:text-sand/40 disabled:opacity-60"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && value !== '' && matches.length > 0 && matches.includes(value.trim()) && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-amber cursor-pointer"
        >
          ✓
        </button>
      )}
      {open && matches.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-hull border border-border-custom rounded-lg max-h-40 overflow-y-auto scrollbar-none shadow-lg">
          {matches.slice(0, 20).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                onChange(cat);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] hover:bg-amber/10 border-b border-border-custom last:border-b-0 transition-colors cursor-pointer ${
                cat === value.trim() ? 'bg-amber/10' : ''
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      {open && registeredCategories.length === 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[9px] text-sand uppercase tracking-[0.08em] shadow-lg">
          NO_AISLES_REGISTERED — ADD AISLES TO A MERCHANT FIRST
        </div>
      )}
    </div>
  );
}