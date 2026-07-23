"use client";

import ModalOverlay, { ModalBody, ModalHeader } from "@/components/modal-overlay";
import SectionLabel from "@/components/section-label";
import Toast, { useToast } from "@/components/toast";
import TopNav from "@/components/top-nav";
import {
  createMerchantAisle,
  createMerchantItemRule,
  deleteCatalogItem,
  deleteMerchantAisle,
  deleteMerchantCategory,
  deleteMerchantItemRule,
  updateCatalogItem,
  updateMerchantItemRule,
  updateMerchantAisle,
  updateMerchantAisleOrder,
  updateMerchantItemRuleOrder,
  renameMerchantCategory,
} from "@/lib/manifest-mutations";
import {
  CATALOG_ITEMS_QUERY,
  MERCHANT_AISLES_QUERY,
  MERCHANT_CATEGORIES_QUERY,
  MERCHANT_ITEM_RULES_QUERY,
  MERCHANT_RECEIPTS_QUERY,
  mapDbCatalogItem,
  mapDbMerchantAisle,
  mapDbMerchantItemRule,
  type DbCatalogItemRow,
  type DbMerchantAisleRow,
  type DbMerchantItemRuleRow,
  type DbMerchantReceiptRow,
} from "@/lib/manifest-queries";
import { MERCHANTS_LIST_QUERY, type DbMerchantListRow } from "@/lib/manifest-queries";
import { usePowerSync, useQuery } from "@powersync/react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

export default function MerchantDetailClient({
  id,
  userId,
}: {
  id: string;
  userId: string | null;
}) {
  const powerSync = usePowerSync();
  const { toast, showToast, hideToast } = useToast();

  // ── Merchant info ──
  const { data: rawMerchants } = useQuery(MERCHANTS_LIST_QUERY, [userId ?? ""]);
  const merchant = useMemo(
    () =>
      ((rawMerchants as unknown as DbMerchantListRow[]) || []).find(
        (m) => m.id === id,
      ),
    [rawMerchants, id],
  );

  // ── Aisles ──
  const { data: rawAisles } = useQuery(MERCHANT_AISLES_QUERY, [id]);
  const aisles = useMemo(
    () =>
      ((rawAisles as unknown as DbMerchantAisleRow[]) || []).map(
        mapDbMerchantAisle,
      ),
    [rawAisles],
  );

  // ── Item rules ──
  const { data: rawRules } = useQuery(MERCHANT_ITEM_RULES_QUERY, [id]);
  const rules = useMemo(
    () =>
      ((rawRules as unknown as DbMerchantItemRuleRow[]) || []).map(
        mapDbMerchantItemRule,
      ),
    [rawRules],
  );

  // ── Merge state ──
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);

  // Other merchants (excluding current)
  const otherMerchants = useMemo(
    () => ((rawMerchants as unknown as DbMerchantListRow[]) || []).filter((m) => m.id !== id),
    [rawMerchants, id],
  );

  const handleMerge = useCallback(async () => {
    if (!mergeTargetId || isMerging) return;
    setIsMerging(true);
    try {
      const response = await fetch("/api/powersync/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId: id, secondaryId: mergeTargetId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Merge failed");
      }

      showToast("✓", "MERGE_COMPLETE");
      setShowMergeModal(false);
      setMergeTargetId(null);
      // Navigate back to merchants list — the merged merchant will reflect changes
      window.location.href = "/merchants";
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "MERGE_FAILED";
      showToast("⊗", msg);
    } finally {
      setIsMerging(false);
    }
  }, [id, mergeTargetId, isMerging, showToast]);

  // ── Receipts ──
  const { data: rawReceipts } = useQuery(MERCHANT_RECEIPTS_QUERY, [id, userId ?? ""]);
  const receipts = useMemo(
    () => (rawReceipts as unknown as DbMerchantReceiptRow[]) || [],
    [rawReceipts],
  );

  // ── Existing categories from all merchant aisles (for searchable dropdown) ──
  const { data: rawCategories } = useQuery(MERCHANT_CATEGORIES_QUERY, [userId ?? ""]);
  const existingCategories = useMemo(
    () => ((rawCategories as unknown as { category: string }[]) || []).map((r) => r.category),
    [rawCategories],
  );

  // ── Catalog items (for rule picker) ──
  const { data: rawCatalog } = useQuery(CATALOG_ITEMS_QUERY, [userId ?? ""]);
  const catalogItems = useMemo(
    () => ((rawCatalog as unknown as DbCatalogItemRow[]) || []).map(mapDbCatalogItem),
    [rawCatalog],
  );

  // ── Add aisle ──
  const [showAddAisle, setShowAddAisle] = useState(false);
  const [newAisleCategory, setNewAisleCategory] = useState("");
  const [isCreatingAisle, setIsCreatingAisle] = useState(false);

  const handleAddAisle = async () => {
    if (!newAisleCategory.trim() || !userId || isCreatingAisle) return;
    setIsCreatingAisle(true);
    try {
      await createMerchantAisle(powerSync, id, userId, newAisleCategory.trim().toUpperCase());
      setNewAisleCategory("");
      setShowAddAisle(false);
      showToast("✓", "AISLE_ADDED");
    } catch {
      showToast("⊗", "FAILED_TO_ADD_AISLE");
    } finally {
      setIsCreatingAisle(false);
    }
  };

  // ── Reorder aisles (native drag) ──
  const [draggedAisleId, setDraggedAisleId] = useState<string | null>(null);
  const handleAisleDragStart = (aisleId: string) => setDraggedAisleId(aisleId);
  const handleAisleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedAisleId || draggedAisleId === targetId) return;
    const reordered = [...aisles];
    const fromIdx = reordered.findIndex((a) => a.id === draggedAisleId);
    const toIdx = reordered.findIndex((a) => a.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const newOrder = reordered.map((a) => a.id);
    setDraggedAisleId(null);
    updateMerchantAisleOrder(powerSync, id, userId ?? "", newOrder);
  };

  // ── Delete aisle ──
  const handleDeleteAisle = async (aisleId: string) => {
    if (!userId) return;
    try {
      await deleteMerchantAisle(powerSync, aisleId, id, userId);
      showToast("✓", "AISLE_DELETED");
    } catch {
      showToast("⊗", "FAILED_TO_DELETE_AISLE");
    }
  };

  // ── Global category editing (reflects across ALL merchants) ──
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const startEditCategory = (category: string) => {
    setEditingCategory(category);
    setEditingCategoryValue(category);
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditingCategoryValue("");
  };

  const handleSaveCategory = async (oldCategory: string) => {
    const trimmed = editingCategoryValue.trim();
    if (!trimmed || !userId || isSavingCategory) return;
    setIsSavingCategory(true);
    try {
      await renameMerchantCategory(powerSync, userId, oldCategory, trimmed);
      showToast("✓", "CATEGORY_RENAMED");
      cancelEditCategory();
      // Reset the add-aisle search so the dropdown reflects the new name.
      setNewAisleCategory("");
    } catch {
      showToast("⊗", "FAILED_TO_RENAME_CATEGORY");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!userId) return;
    const confirmed = window.confirm(
      `Remove the "${category}" aisle from ALL your merchants? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteMerchantCategory(powerSync, userId, category);
      showToast("✓", "CATEGORY_DELETED");
      // If the deleted category was selected, clear the search.
      if (newAisleCategory.toUpperCase() === category) {
        setNewAisleCategory("");
      }
    } catch {
      showToast("⊗", "FAILED_TO_DELETE_CATEGORY");
    }
  };

  // ── Edit aisle ──
  const [editingAisle, setEditingAisle] = useState<{
    id: string;
    category: string;
  } | null>(null);

  // ── Add rule ──
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleItemId, setNewRuleItemId] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("");
  const [isCreatingRule, setIsCreatingRule] = useState(false);

  const handleAddRule = async () => {
    if (!newRuleItemId || !newRuleCategory.trim() || !userId || isCreatingRule) return;
    setIsCreatingRule(true);
    try {
      await createMerchantItemRule(
        powerSync, id, newRuleItemId, userId, newRuleCategory.trim().toUpperCase(),
      );
      setNewRuleItemId("");
      setNewRuleCategory("");
      setShowAddRule(false);
      showToast("✓", "RULE_ADDED");
    } catch {
      showToast("⊗", "FAILED_TO_ADD_RULE");
    } finally {
      setIsCreatingRule(false);
    }
  };

  // ── Edit rule modal ──
  const [editingRule, setEditingRule] = useState<{
    id: string;
    category: string;
  } | null>(null);

  // ── Delete rule ──
  const handleDeleteRule = async (ruleId: string) => {
    if (!userId) return;
    try {
      await deleteMerchantItemRule(powerSync, ruleId, id, userId);
      showToast("✓", "RULE_DELETED");
    } catch {
      showToast("⊗", "FAILED_TO_DELETE_RULE");
    }
  };

  // ── Reorder rules (native drag) ──
  const [draggedRuleId, setDraggedRuleId] = useState<string | null>(null);
  const handleRuleDragStart = (ruleId: string) => setDraggedRuleId(ruleId);
  const handleRuleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedRuleId || draggedRuleId === targetId) return;
    const reordered = [...rules];
    const fromIdx = reordered.findIndex((r) => r.id === draggedRuleId);
    const toIdx = reordered.findIndex((r) => r.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const newOrder = reordered.map((r) => r.id);
    setDraggedRuleId(null);
    updateMerchantItemRuleOrder(powerSync, id, userId ?? "", newOrder);
  };

  // Catalog item name lookup
  const catalogItemName = useCallback(
    (itemId: string) => catalogItems.find((c) => c.id === itemId)?.name ?? "UNKNOWN",
    [catalogItems],
  );

  if (!merchant) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl opacity-40 mb-3">⊘</div>
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">
            MERCHANT_NOT_FOUND
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <TopNav backHref="/merchants" backLabel="" title={merchant.name} />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-6">
        {/* Merchant name header */}
        <div className="px-5 py-3 border-b border-border-custom">
          <div className="font-mono text-[9px] text-sand tracking-[0.16em] uppercase mb-1">
            &#47;&#47; MERCHANT &#47;&#47;
          </div>
          <div className="font-tight text-[22px] font-bold text-cream uppercase tracking-[0.06em]">
            {merchant.emoji || "🏪"} {merchant.name}
          </div>
          {otherMerchants.length > 0 && (
            <button
              onClick={() => setShowMergeModal(true)}
              className="mt-2 font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-amber bg-amber/8 border-[1.5px] border-amber/35 rounded-md px-3 py-1.5 cursor-pointer hover:border-amber hover:bg-amber/14 transition-all"
            >
              ⚡ MERGE_INTO_ANOTHER
            </button>
          )}
        </div>

        {/* ─── Aisles Section ─── */}
        <div className="px-5 pt-4">
          <SectionLabel right={`${aisles.length} AISLES`}>
            &#47;&#47; AISLES &#47;&#47;
          </SectionLabel>

          {/* Table header */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 mb-1">
            <span className="w-4" />
            <span className="flex-1 font-mono text-[8px] font-bold tracking-[0.12em] uppercase text-panel2">
              CATEGORY
            </span>
            <span className="font-mono text-[8px] font-bold tracking-[0.12em] uppercase text-panel2 mr-9">
              ACTIONS
            </span>
          </div>

          {/* Table rows */}
          <div className="flex flex-col gap-1.5">
            {aisles.map((aisle) => (
              <div
                key={aisle.id}
                draggable
                onDragStart={() => handleAisleDragStart(aisle.id)}
                onDragOver={(e) => handleAisleDragOver(e, aisle.id)}
                onDragEnd={() => setDraggedAisleId(null)}
                className={`bg-panel border border-border-custom rounded-lg px-3.5 py-2.5 flex items-center gap-3 cursor-grab active:cursor-grabbing select-none transition-colors ${
                  draggedAisleId === aisle.id ? "opacity-50" : ""
                }`}
              >
                <span className="font-mono text-xs text-sand cursor-grab">⠿</span>
                <span className="flex-1 font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-cream">
                  {aisle.category}
                </span>
                <button
                  onClick={() =>
                    setEditingAisle({ id: aisle.id, category: aisle.category })
                  }
                  className="font-mono text-[9px] text-blue border border-blue/30 rounded px-1.5 py-0.5 cursor-pointer hover:bg-blue/10 transition-colors"
                >
                  EDIT
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAisle(aisle.id);
                  }}
                  className="font-mono text-xs text-sand hover:text-red cursor-pointer transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {showAddAisle ? (
            <div className="mt-2 bg-panel border border-amber/40 rounded-lg p-3 relative">
              <div className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-amber mb-2">
                // NEW_AISLE //
              </div>
              <input
                type="text"
                value={newAisleCategory}
                onChange={(e) => setNewAisleCategory(e.target.value.toUpperCase())}
                placeholder="SEARCH_OR_TYPE_CATEGORY..."
                className="w-full bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber placeholder:text-sand/40 mb-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddAisle();
                  if (e.key === "Escape") setShowAddAisle(false);
                }}
                autoFocus
              />
              {/* Searchable dropdown of existing categories */}
              {newAisleCategory && existingCategories.filter(
                (c) => c.startsWith(newAisleCategory),
              ).length > 0 && (
                <div className="absolute z-10 left-3 right-3 top-[100px] bg-hull border border-border-custom rounded-lg max-h-52 overflow-y-auto scrollbar-none shadow-lg">
                  {existingCategories
                    .filter((c) => c.startsWith(newAisleCategory))
                    .slice(0, 20)
                    .map((cat) =>
                      editingCategory === cat ? (
                        <div
                          key={cat}
                          className="px-2 py-2 border-b border-border-custom last:border-b-0 bg-amber/5"
                        >
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingCategoryValue}
                              onChange={(e) =>
                                setEditingCategoryValue(
                                  e.target.value.toUpperCase(),
                                )
                              }
                              placeholder="NEW_CATEGORY"
                              className="flex-1 min-w-0 bg-hull border border-amber/50 rounded px-2 py-1.5 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber placeholder:text-sand/40"
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleSaveCategory(cat);
                                if (e.key === "Escape") cancelEditCategory();
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCategory(cat)}
                              disabled={
                                !editingCategoryValue.trim() ||
                                isSavingCategory
                              }
                              className="font-mono text-[9px] font-bold text-hull bg-amber rounded px-1.5 py-1 cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                            >
                              {isSavingCategory ? "..." : "SAVE"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditCategory}
                              className="font-mono text-[9px] text-sand hover:text-cream cursor-pointer px-1"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="mt-1 font-mono text-[8px] text-sand/70 tracking-[0.08em] uppercase">
                            // APPLIES TO ALL MERCHANTS
                          </div>
                        </div>
                      ) : (
                        <div
                          key={cat}
                          className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border-custom last:border-b-0 hover:bg-amber/10 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => setNewAisleCategory(cat)}
                            className="flex-1 min-w-0 text-left font-mono text-[10px] text-cream uppercase tracking-[0.08em] cursor-pointer truncate"
                          >
                            {cat}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditCategory(cat);
                            }}
                            className="font-mono text-[9px] text-blue border border-blue/30 rounded px-1.5 py-0.5 cursor-pointer hover:bg-blue/10 transition-colors"
                          >
                            EDIT
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat);
                            }}
                            className="font-mono text-[9px] text-red border border-red/30 rounded px-1.5 py-0.5 cursor-pointer hover:bg-red/10 transition-colors"
                          >
                            DEL
                          </button>
                        </div>
                      ),
                    )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddAisle(false);
                    setNewAisleCategory("");
                  }}
                  className="flex-1 py-1.5 border border-border-custom rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAddAisle}
                  disabled={!newAisleCategory.trim() || isCreatingAisle}
                  className="flex-1 py-1.5 bg-amber border border-[#C07830] rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-hull cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isCreatingAisle ? "ADDING..." : "ADD"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddAisle(true)}
              className="mt-2 w-full bg-transparent border-[1.5px] border-dashed border-blue/35 rounded-lg py-2 flex items-center justify-center gap-2 cursor-pointer hover:border-blue hover:bg-blue/5 transition-all"
            >
              <span className="font-mono text-xs">＋</span>
              <span className="font-mono text-[8px] font-bold tracking-[0.1em] uppercase text-blue">
                ADD_AISLE
              </span>
            </button>
          )}
        </div>

        {/* ─── Item Rules Section ─── */}
        <div className="px-5 pt-5">
          <SectionLabel right={`${rules.length} RULES`}>
            &#47;&#47; ITEM_RULES &#47;&#47;
          </SectionLabel>
          <div className="flex flex-col gap-1.5">
            {rules.map((rule, i) => (
              <div
                key={rule.id}
                draggable
                onDragStart={() => handleRuleDragStart(rule.id)}
                onDragOver={(e) => handleRuleDragOver(e, rule.id)}
                onDragEnd={() => setDraggedRuleId(null)}
                className={`bg-panel border border-border-custom rounded-lg px-3.5 py-2.5 flex items-center gap-3 cursor-grab active:cursor-grabbing select-none ${
                  draggedRuleId === rule.id ? "opacity-50" : ""
                }`}
              >
                <span className="font-mono text-xs text-sand cursor-grab">⠿</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream truncate">
                    {catalogItemName(rule.manifest_item_id)}
                  </div>
                  <div className="font-mono text-[9px] text-amber tracking-[0.08em] uppercase">
                    → {rule.category}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setEditingRule({ id: rule.id, category: rule.category })
                  }
                  className="font-mono text-[9px] text-blue border border-blue/30 rounded px-1.5 py-0.5 cursor-pointer hover:bg-blue/10 transition-colors"
                >
                  EDIT
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="font-mono text-xs text-sand hover:text-red cursor-pointer transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {showAddRule ? (
            <div className="mt-2 bg-panel border border-amber/40 rounded-lg p-3">
              <div className="font-mono text-[10px] font-bold tracking-[0.08em] uppercase text-cream mb-2">
                // NEW_RULE //
              </div>
              <select
                value={newRuleItemId}
                onChange={(e) => setNewRuleItemId(e.target.value)}
                className="w-full bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber mb-2 appearance-none"
              >
                <option value="">SELECT_CATALOG_ITEM</option>
                {catalogItems.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newRuleCategory}
                onChange={(e) => setNewRuleCategory(e.target.value.toUpperCase())}
                placeholder="CATEGORY"
                className="w-full bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber placeholder:text-sand/40 mb-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddRule();
                  if (e.key === "Escape") {
                    setShowAddRule(false);
                    setNewRuleItemId("");
                    setNewRuleCategory("");
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddRule(false);
                    setNewRuleItemId("");
                    setNewRuleCategory("");
                  }}
                  className="flex-1 py-1.5 border border-border-custom rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={!newRuleItemId || !newRuleCategory.trim() || isCreatingRule}
                  className="flex-1 py-1.5 bg-amber border border-[#C07830] rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-hull cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isCreatingRule ? "ADDING..." : "ADD"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRule(true)}
              className="mt-2 w-full bg-transparent border-[1.5px] border-dashed border-blue/35 rounded-lg py-2 flex items-center justify-center gap-2 cursor-pointer hover:border-blue hover:bg-blue/5 transition-all"
            >
              <span className="font-mono text-xs">＋</span>
              <span className="font-mono text-[8px] font-bold tracking-[0.1em] uppercase text-blue">
                ADD_RULE
              </span>
            </button>
          )}
        </div>

        {/* ─── Receipts Section ─── */}
        <div className="px-5 pt-5">
          <SectionLabel right={`${receipts.length} RECEIPTS`}>
            &#47;&#47; RECEIPTS &#47;&#47;
          </SectionLabel>
          {receipts.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {receipts.map((r) => (
                <Link
                  key={r.id}
                  href={`/receipts/${r.id}`}
                  className="no-underline"
                >
                  <div className="bg-panel border border-border-custom rounded-lg px-3.5 py-3 flex items-center gap-3 cursor-pointer hover:border-sand transition-colors">
                    <span className="text-base">🧾</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream truncate">
                        {r.receipt_date
                          ? new Date(r.receipt_date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "NO_DATE"}
                      </div>
                      <div className="font-mono text-[9px] text-sand">
                        {r.item_count ?? "—"} items
                        {r.total != null ? ` · ${Number(r.total).toFixed(2)} kCr` : ""}
                      </div>
                    </div>
                    <span className="font-mono text-xs text-sand">›</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-3.5 py-6 text-center">
              <div className="font-mono text-[10px] text-sand">
                NO_RECEIPTS_REGISTERED
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Edit Aisle Modal ─── */}
      <ModalOverlay
        show={!!editingAisle}
        onClose={() => setEditingAisle(null)}
      >
        <ModalHeader
          title="EDIT_AISLE"
          onClose={() => setEditingAisle(null)}
        />
        <ModalBody>
          {editingAisle && (
            <EditAisleForm
              aisleId={editingAisle.id}
              initialCategory={editingAisle.category}
              merchantId={id}
              userId={userId}
              powerSync={powerSync}
              onSaved={() => {
                setEditingAisle(null);
                showToast("✓", "AISLE_UPDATED");
              }}
              onCancel={() => setEditingAisle(null)}
            />
          )}
        </ModalBody>
      </ModalOverlay>

      {/* ─── Edit Rule Modal ─── */}
      <ModalOverlay
        show={!!editingRule}
        onClose={() => setEditingRule(null)}
      >
        <ModalHeader
          title="EDIT_RULE"
          onClose={() => setEditingRule(null)}
        />
        <ModalBody>
          {editingRule && (
            <EditRuleForm
              ruleId={editingRule.id}
              initialCategory={editingRule.category}
              merchantId={id}
              userId={userId}
              powerSync={powerSync}
              onSaved={() => {
                setEditingRule(null);
                showToast("✓", "RULE_UPDATED");
              }}
              onCancel={() => setEditingRule(null)}
            />
          )}
        </ModalBody>
      </ModalOverlay>

      {/* ─── Merge Modal ─── */}
      <ModalOverlay
        show={showMergeModal}
        onClose={() => {
          setShowMergeModal(false);
          setMergeTargetId(null);
        }}
      >
        <ModalHeader
          title="MERGE_MERCHANT"
          onClose={() => {
            setShowMergeModal(false);
            setMergeTargetId(null);
          }}
          titleColor="var(--amber)"
        />
        <ModalBody>
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">⚡</div>
            <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-cream mb-1">
              MERGE &ldquo;{merchant.name}&rdquo; INTO...
            </div>
            <div className="font-mono text-[9px] text-sand">
              This merchant will be absorbed into the selected primary. Its aisles,
              rules, receipts, and price history will be repointed. This action
              cannot be undone.
            </div>
          </div>

          {otherMerchants.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {otherMerchants.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMergeTargetId(m.id)}
                  className={`flex items-center gap-3 px-3.5 py-3 border rounded-lg bg-hull cursor-pointer hover:border-amber transition-all text-left ${
                    mergeTargetId === m.id
                      ? "border-amber bg-amber/5"
                      : "border-border-custom"
                  }`}
                >
                  <span className="text-lg">{m.emoji || "🏪"}</span>
                  <span className="flex-1 font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream">
                    {m.name}
                  </span>
                  {mergeTargetId === m.id && (
                    <span className="font-mono text-[9px] text-amber">✓</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 mb-4">
              <div className="font-mono text-[10px] text-sand">NO_OTHER_MERCHANTS</div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowMergeModal(false);
                setMergeTargetId(null);
              }}
              className="flex-1 py-3 border border-border-custom rounded-lg font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
            >
              CANCEL
            </button>
            <button
              onClick={handleMerge}
              disabled={!mergeTargetId || isMerging}
              className="flex-1 py-3 bg-amber border border-[#C07830] rounded-lg font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-hull cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isMerging ? "MERGING..." : "MERGE"}
            </button>
          </div>
        </ModalBody>
      </ModalOverlay>

      <Toast
        icon={toast.icon}
        message={toast.message}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}

// ─── Inline edit-aisle form ───
function EditAisleForm({
  aisleId,
  initialCategory,
  merchantId,
  userId,
  powerSync,
  onSaved,
  onCancel,
}: {
  aisleId: string;
  initialCategory: string;
  merchantId: string;
  userId: string | null;
  powerSync: any;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!category.trim() || !userId || isSaving) return;
    setIsSaving(true);
    try {
      await updateMerchantAisle(powerSync, aisleId, merchantId, userId, {
        category: category.trim().toUpperCase(),
      });
      onSaved();
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={category}
        onChange={(e) => setCategory(e.target.value.toUpperCase())}
        placeholder="CATEGORY"
        className="w-full bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber placeholder:text-sand/40"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 border border-border-custom rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
        >
          CANCEL
        </button>
        <button
          onClick={handleSave}
          disabled={!category.trim() || isSaving}
          className="flex-1 py-2 bg-amber border border-[#C07830] rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-hull cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </button>
      </div>
    </div>
  );
}

// ─── Inline edit-rule form ───
function EditRuleForm({
  ruleId,
  initialCategory,
  merchantId,
  userId,
  powerSync,
  onSaved,
  onCancel,
}: {
  ruleId: string;
  initialCategory: string;
  merchantId: string;
  userId: string | null;
  powerSync: any;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!category.trim() || !userId || isSaving) return;
    setIsSaving(true);
    try {
      await updateMerchantItemRule(powerSync, ruleId, merchantId, userId, {
        category: category.trim().toUpperCase(),
      });
      onSaved();
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={category}
        onChange={(e) => setCategory(e.target.value.toUpperCase())}
        placeholder="CATEGORY"
        className="w-full bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber placeholder:text-sand/40"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 border border-border-custom rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
        >
          CANCEL
        </button>
        <button
          onClick={handleSave}
          disabled={!category.trim() || isSaving}
          className="flex-1 py-2 bg-amber border border-[#C07830] rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-hull cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </button>
      </div>
    </div>
  );
}
