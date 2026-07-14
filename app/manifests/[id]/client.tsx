"use client";

import AddItemsModal from "@/components/add-items-modal";
import Badge from "@/components/badge";
import ModalOverlay, {
  ModalBody,
  ModalHeader,
} from "@/components/modal-overlay";
import SectionLabel from "@/components/section-label";
import Toast, { useToast } from "@/components/toast";
import TopNav from "@/components/top-nav";
import {
  activateManifest,
  archiveManifest,
  completeManifest,
  deleteManifest,
  removeManifestItem,
  toggleManifestItemChecked,
  updateManifest,
} from "@/lib/manifest-mutations";
import {
  MANIFEST_CREW_QUERY,
  MANIFEST_DETAIL_QUERY,
  MANIFEST_ITEMS_QUERY,
  mapDbCrewToCrewMember,
  mapDbManifestDetailToManifest,
  mapDbManifestItemToManifestItem,
  type DbManifestCrewRow,
  type DbManifestDetailRow,
  type DbManifestItemRow,
} from "@/lib/manifest-queries";
import {
  MANIFEST_AVAILABLE_CREW_QUERY,
  type DbAvailableCrewRow,
} from "@/lib/crew-queries";
import {
  addCrewToManifest,
  removeCrewFromManifest,
} from "@/lib/crew-mutations";
import { usePowerSync, useQuery } from "@powersync/react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

const MANIFEST_TYPES = [
  "WEEKLY",
  "BULK",
  "MONTHLY",
  "QUICK",
  "TARGETED",
  "CUSTOM",
] as const;

export default function ManifestDetailClient({
  id,
  userId,
}: {
  id: string;
  userId: string | null;
}) {
  const router = useRouter();
  const powerSync = usePowerSync();
  const { toast, showToast, hideToast } = useToast();
  const { data: rawManifest, isLoading: manifestLoading } = useQuery(
    MANIFEST_DETAIL_QUERY,
    [id],
  );
  const { data: rawItems, isLoading: itemsLoading } = useQuery(
    MANIFEST_ITEMS_QUERY,
    [id],
  );
  const { data: rawCrew, isLoading: crewLoading } = useQuery(
    MANIFEST_CREW_QUERY,
    [id, id, id],
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showIncludeOperator, setShowIncludeOperator] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  const { data: rawAvailableCrew } = useQuery(
    MANIFEST_AVAILABLE_CREW_QUERY,
    [userId ?? "", userId ?? "", userId ?? "", id],
  );

  const isLoading = manifestLoading || itemsLoading || crewLoading;

  const mft = useMemo(() => {
    const rows = rawManifest as unknown as DbManifestDetailRow[];
    if (!rows || rows.length === 0) return null;
    const items = ((rawItems as unknown as DbManifestItemRow[]) || []).map(
      mapDbManifestItemToManifestItem,
    );
    const crew = ((rawCrew as unknown as DbManifestCrewRow[]) || []).map(
      mapDbCrewToCrewMember,
    );
    return mapDbManifestDetailToManifest(rows[0], items, crew);
  }, [rawManifest, rawItems, rawCrew]);

  const isCreator = !!userId && !!mft?.createdBy && userId === mft.createdBy;
  const canEditCrew = isCreator && (mft?.status === "draft" || mft?.status === "active");
  const editable = mft?.status === "draft" || mft?.status === "active";
  const canAddItems = mft?.status === "draft" || mft?.status === "active";
  const canRemoveItems = mft?.status === "draft";
  const canToggleChecked = mft?.status === "active";

  const checkedPercentage = useMemo(() => {
    if (!mft || mft.items.length === 0) return 0;
    const checked = mft.items.filter((item) => item.checked).length;
    return Math.round((checked / mft.items.length) * 100);
  }, [mft]);

  const confidenceDisplay = useMemo(() => {
    if (!mft) return "";
    if (mft.items.length === 0) return "0%";
    return mft.confidence || `${checkedPercentage}%`;
  }, [mft, checkedPercentage]);

  const [showAddItems, setShowAddItems] = useState(false);

  const STATUS_TRANSITIONS: Record<
    string,
    {
      label: string;
      bg: string;
      border: string;
      shadow: string;
      textColor: string;
    } | null
  > = {
    draft: {
      label: "ACTIVATE_MANIFEST",
      bg: "bg-green",
      border: "border-[#1B8452]",
      shadow: "0 0 20px rgba(49,196,132,0.3)",
      textColor: "text-hull",
    },
    active: {
      label: "MARK_COMPLETE",
      bg: "bg-amber",
      border: "border-[#C07830]",
      shadow: "0 0 20px rgba(217,140,69,0.3)",
      textColor: "text-hull",
    },
    done: {
      label: "ARCHIVE",
      bg: "bg-sand",
      border: "border-[#8B7D6B]",
      shadow: "0 0 20px rgba(191,175,155,0.3)",
      textColor: "text-hull",
    },
    archived: null,
  };

  const transitionConfig = mft ? STATUS_TRANSITIONS[mft.status] : null;
  const canTransition = mft?.status !== "draft" || (mft?.items.length ?? 0) > 0;

  const handleStatusTransitionClick = useCallback(() => {
    if (!mft) return;
    setShowStatusConfirm(true);
  }, [mft]);

  const handleStatusTransition = useCallback(async () => {
    if (!mft) return;
    setShowStatusConfirm(false);
    switch (mft.status) {
      case "draft":
        await activateManifest(powerSync, mft.id);
        break;
      case "active":
        await completeManifest(powerSync, mft.id);
        break;
      case "done":
        await archiveManifest(powerSync, mft.id);
        break;
    }
  }, [mft, powerSync]);

  const [titleValue, setTitleValue] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleTitleFocus = useCallback(() => {
    if (mft) {
      setTitleValue(mft.title);
      setIsEditingTitle(true);
    }
  }, [mft]);

  const handleTitleBlur = useCallback(async () => {
    if (!mft || !editable) return;
    setIsEditingTitle(false);
    if (titleValue === mft.title) return;
    await updateManifest(
      powerSync,
      mft.id,
      { title: titleValue || null },
    );
  }, [mft, editable, titleValue, powerSync]);

  const handleTypeChange = useCallback(
    async (type: string) => {
      if (!mft || !editable) return;
      if (type === mft.type) return;
      await updateManifest(powerSync, mft.id, { type });
    },
    [mft, editable, powerSync],
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      if (!canRemoveItems || !mft) return;
      await removeManifestItem(powerSync, mft.id, itemId);
    },
    [canRemoveItems, mft, powerSync],
  );

  const handleToggleChecked = useCallback(
    async (itemId: string, checked: boolean) => {
      if (!canToggleChecked) return;
      await toggleManifestItemChecked(powerSync, itemId, checked);
    },
    [canToggleChecked, powerSync],
  );

  const handleDelete = useCallback(async () => {
    if (!mft || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteManifest(powerSync, mft.id, userId);
      router.push("/manifests");
    } catch (error) {
      showToast("⊗", "DELETE_FAILED");
      setIsDeleting(false);
    }
  }, [mft, powerSync, router, isDeleting, showToast]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">
            LOADING_MANIFEST
          </div>
          <div className="font-mono text-[10px] text-panel2">
            Fetching manifest data...
          </div>
        </div>
      </div>
    );
  }

  if (!mft) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl opacity-40 mb-3">⊘</div>
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">
            MANIFEST_NOT_FOUND
          </div>
          <div className="text-xs text-panel2">
            Manifest #{id} does not exist.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <TopNav
        backHref="/manifests"
        backLabel=""
        title={mft.title}
        rightAction={
          isCreator ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-[30px] h-[30px] rounded-md border border-red/40 bg-red/5 flex items-center justify-center cursor-pointer text-red/70 text-sm font-mono hover:border-red hover:text-red hover:bg-red/10 transition-all"
            >
              x
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-6">
        <div className="px-5 py-3 border-b border-border-custom">
          <div className="font-mono text-[9px] text-sand tracking-[0.16em] uppercase mb-1">
            &#47;&#47; MANIFEST_TITLE &#47;&#47;
          </div>
          {editable ? (
            <input
              type="text"
              value={isEditingTitle ? titleValue : mft.title}
              onFocus={handleTitleFocus}
              onChange={(e) => setTitleValue(e.target.value.toUpperCase())}
              onBlur={handleTitleBlur}
              placeholder="ENTER_MANIFEST_NAME"
              className="w-full font-tight text-[22px] font-bold text-cream uppercase tracking-[0.06em] mb-3 bg-transparent border-b-2 border-border-custom focus:border-amber outline-none placeholder:text-sand/40 py-1"
            />
          ) : (
            <div className="font-tight text-[22px] font-bold text-cream uppercase tracking-[0.06em] mb-3">
              {mft.title}
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="font-mono text-[10px] text-sand tracking-[0.1em] uppercase">
              EST_TOTAL:
            </span>
            <span className="font-heading text-2xl font-bold text-cream">
              {mft.estTotal.toFixed(2)}
            </span>
            <span className="font-mono text-sm text-sand">kCr</span>
          </div>

          {mft.status !== "draft" && (
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[9px] text-sand tracking-[0.1em] uppercase whitespace-nowrap">
                COMP_LVL:
              </span>
              <div className="flex items-center gap-1.5 flex-1">
                <div className="flex-1 h-2 bg-hull border border-border-custom rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green to-green/50 rounded-sm"
                    style={{ width: `${checkedPercentage}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] text-amber">
                  {confidenceDisplay}
                </span>
              </div>
            </div>
          )}
          {transitionConfig && (
            <button
              onClick={handleStatusTransitionClick}
              disabled={!canTransition}
              className={`w-full ${transitionConfig.bg} border-2 ${transitionConfig.border} rounded-lg py-3 font-mono text-[11px] font-bold tracking-[0.12em] uppercase ${transitionConfig.textColor} ${canTransition ? "cursor-pointer hover:opacity-90" : "bg-panel border-border-custom text-panel2 cursor-not-allowed"} mt-3 transition-opacity ${canTransition ? "" : "hover:opacity-100"}`}
              style={{
                boxShadow: canTransition
                  ? `inset 0 -3px 0 rgba(0,0,0,0.4), ${transitionConfig.shadow}`
                  : "inset 0 -3px 0 rgba(0,0,0,0.2)",
              }}
            >
              [[ {transitionConfig.label} ]]
            </button>
          )}
        </div>

        <div className="px-5 pt-4 pb-2">
          <div className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase text-sand border-b border-border-custom pb-1.5 flex-1">
            &#47;&#47; MANIFEST_ITEMS &#47;&#47;
          </div>
          {canAddItems && (
            <button
              onClick={() => setShowAddItems(true)}
              className="font-mono font-bold tracking-[0.1em] uppercase text-blue bg-blue/8 border-[1.5px] border-blue/35 rounded-md my-2 px-3 py-2 w-full cursor-pointer hover:border-blue hover:bg-blue/14 transition-all"
            >
              <span className="text-xs">＋</span> ADD_ITEM
            </button>
          )}
        </div>

        <div className="px-5 flex flex-col gap-2">
          {mft.items.map((item, i) => (
            <div
              key={item.id || i}
              className={`bg-panel border border-border-custom rounded-lg px-3.5 py-3 flex items-center gap-3 ${item.checked ? "opacity-65" : ""} ${item.unknown ? "border-amber/30" : ""}`}
            >
              {mft.status !== "draft" && (
                <>
                  {canToggleChecked ? (
                    <button
                      onClick={() =>
                        handleToggleChecked(item.id, !item.checked)
                      }
                      className={`w-[22px] h-[22px] flex-shrink-0 border-2 rounded-sm bg-hull flex items-center justify-center font-mono text-sm font-bold text-green cursor-pointer hover:border-green transition-colors ${item.checked ? "border-green" : item.unknown ? "border-amber" : "border-border-custom"}`}
                    >
                      {item.checked && "✕"}
                    </button>
                  ) : (
                    <div
                      className={`w-[22px] h-[22px] flex-shrink-0 border-2 rounded-sm bg-hull flex items-center justify-center font-mono text-sm font-bold text-green ${item.checked ? "border-green" : item.unknown ? "border-amber" : "border-border-custom"}`}
                    >
                      {item.checked && "✕"}
                    </div>
                  )}
                </>
              )}
              <div className={`flex-1 ${mft.status === "draft" ? "" : ""}`}>
                <div
                  className={`text-[13px] font-semibold uppercase tracking-[0.04em] ${item.checked ? "text-sand" : "text-cream"}`}
                >
                  {item.name}
                </div>
              </div>
              {canRemoveItems ? (
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="font-mono text-xs text-sand hover:text-red cursor-pointer transition-colors px-1"
                >
                  ✕
                </button>
              ) : item.unknown ? (
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

        <div className="mt-4 px-5 pt-4">
          <SectionLabel right={`${mft.crew.length} OPERATORS`}>
            &#47;&#47; MISSION_CREW &#47;&#47;
          </SectionLabel>
          <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden mb-2.5">
            {mft.crew.map((member, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border-custom last:border-b-0"
              >
                <div
                  className="w-9 h-9 flex-shrink-0 rounded-full border-2 border-cream bg-panel2 flex items-center justify-center font-mono text-[11px] font-bold text-cream"
                  style={{ background: member.color }}
                >
                  {member.initials}
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream mb-0.5">
                    {member.callsign}
                  </div>
                  <div className="font-mono text-[9px] text-sand tracking-wider">
                    {member.role}
                  </div>
                </div>
                <Badge
                  variant={member.badge === "COMMANDER" ? "green" : "sand"}
                >
                  {member.badge}
                </Badge>
                {canEditCrew && member.badge !== "COMMANDER" && member.id && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove ${member.callsign} from this manifest?`)) return;
                      await removeCrewFromManifest(powerSync, mft.id, member.id!);
                    }}
                    className="font-mono text-xs text-sand hover:text-red cursor-pointer transition-colors px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {canEditCrew && (
            <button
              onClick={() => setShowIncludeOperator(true)}
              className="w-full bg-transparent border-[1.5px] border-dashed border-amber/35 rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer hover:border-amber hover:bg-amber/5 transition-all"
            >
              <span className="font-mono text-base">＋</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-amber">
                &#47;&#47; INCLUDE_OPERATOR &#47;&#47;
              </span>
            </button>
          )}
        </div>
      </div>

      <ModalOverlay
        show={showIncludeOperator}
        onClose={() => setShowIncludeOperator(false)}
      >
        <ModalHeader
          title="INCLUDE_OPERATOR"
          onClose={() => setShowIncludeOperator(false)}
        />
        <ModalBody>
          {(rawAvailableCrew as unknown as DbAvailableCrewRow[])?.length > 0 ? (
            <div className="flex flex-col gap-2">
              {(rawAvailableCrew as unknown as DbAvailableCrewRow[]).map(
                (row) => (
                  <button
                    key={row.id}
                    onClick={async () => {
                      await addCrewToManifest(
                        powerSync,
                        mft!.id,
                        row.id,
                        "OPERATOR",
                      );
                      setShowIncludeOperator(false);
                      showToast("✓", "OPERATOR_ADDED");
                    }}
                    className="flex items-center gap-3 px-3.5 py-3 border border-border-custom rounded-lg bg-hull cursor-pointer hover:border-amber transition-all text-left"
                  >
                    <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream">
                      {row.callsign}
                    </span>
                  </button>
                ),
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="font-mono text-[10px] text-sand">
                NO_CREW_AVAILABLE
              </div>
            </div>
          )}
        </ModalBody>
      </ModalOverlay>

      {canAddItems && (
        <AddItemsModal
          show={showAddItems}
          manifestId={mft.id}
          existingItemIds={new Set(mft.items.map((i) => i.itemId ?? i.id))}
          onClose={() => setShowAddItems(false)}
          onItemsAdded={() => showToast("📦", "ITEMS_ADDED_TO_MANIFEST")}
        />
      )}

      <Toast
        icon={toast.icon}
        message={toast.message}
        visible={toast.visible}
        onClose={hideToast}
      />
      <ModalOverlay
        show={showStatusConfirm}
        onClose={() => setShowStatusConfirm(false)}
      >
        <ModalHeader
          title="CONFIRM_STATUS_CHANGE"
          onClose={() => setShowStatusConfirm(false)}
          titleColor={
            mft.status === "draft"
              ? "var(--green)"
              : mft.status === "active"
                ? "var(--amber)"
                : "var(--sand)"
          }
        />
        <ModalBody>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">
              {mft.status === "draft" ? "▶" : mft.status === "active" ? "✓" : "📦"}
            </div>
            <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-cream mb-2">
              {transitionConfig?.label}
            </div>
            <div className="font-mono text-[10px] text-sand">
              {mft.status === "draft" && "This will activate the manifest and begin tracking items."}
              {mft.status === "active" && "This will mark the manifest as complete. No more items can be checked."}
              {mft.status === "done" && "This will archive the manifest. It will be read-only."}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowStatusConfirm(false)}
              className="flex-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase py-3 border border-border-custom rounded-lg text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
            >
              CANCEL
            </button>
            <button
              onClick={handleStatusTransition}
              className={`flex-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase py-3 border rounded-lg text-cream transition-all cursor-pointer ${
                mft.status === "draft"
                  ? "bg-green border-green hover:bg-green/80"
                  : mft.status === "active"
                    ? "bg-amber border-amber hover:bg-amber/80"
                    : "bg-sand border-sand hover:bg-sand/80"
              }`}
            >
              CONFIRM
            </button>
          </div>
        </ModalBody>
      </ModalOverlay>

      <ModalOverlay
        show={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <ModalHeader
          title="CONFIRM_DELETE"
          onClose={() => setShowDeleteConfirm(false)}
          titleColor="var(--red)"
        />
        <ModalBody>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">⊗</div>
            <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-cream mb-2">
              DELETE_MANIFEST
            </div>
            <div className="font-mono text-[10px] text-sand">
              This will remove all items. This action cannot be undone.
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase py-3 border border-border-custom rounded-lg text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
            >
              CANCEL
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase py-3 bg-red border border-red rounded-lg text-cream hover:bg-red/80 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? "DELETING..." : "DELETE"}
            </button>
          </div>
        </ModalBody>
      </ModalOverlay>
    </div>
  );
}
