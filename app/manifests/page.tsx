"use client";

import Badge from "@/components/badge";
import ProgressBar from "@/components/progress-bar";
import SectionLabel from "@/components/section-label";
import Toast, { useToast } from "@/components/toast";
import { authClient } from "@/lib/auth-client";
import { createManifest } from "@/lib/manifest-mutations";
import {
  MANIFESTS_LIST_QUERY,
  mapDbManifestToManifestListItem,
  type DbManifestListRow,
} from "@/lib/manifest-queries";
import type { Manifest } from "@/lib/types";
import { usePowerSync, useQuery } from "@powersync/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const statusColors: Record<
  string,
  { stripe: string; border: string; ring: string }
> = {
  active: {
    stripe: "bg-green",
    border: "border-green/40",
    ring: "shadow-[0_0_0_0_rgba(120,168,144,0)] animate-[activering_3s_ease_infinite]",
  },
  draft: { stripe: "bg-blue", border: "border-blue/30", ring: "" },
  done: {
    stripe: "bg-sand",
    border: "border-border-custom",
    ring: "opacity-75",
  },
  archived: {
    stripe: "bg-panel2",
    border: "border-border-custom",
    ring: "opacity-45",
  },
};

export default function ManifestsPage() {
  const router = useRouter();
  const powerSync = usePowerSync();
  const [filter, setFilter] = useState("all");
  const { toast, showToast, hideToast } = useToast();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? null;

  const currentValue = "kCr";
  const { data: rawManifests, isLoading } = useQuery(MANIFESTS_LIST_QUERY);

  const manifests: Manifest[] = useMemo(
    () =>
      ((rawManifests as unknown as DbManifestListRow[]) || []).map(
        mapDbManifestToManifestListItem,
      ),
    [rawManifests],
  );

  const filtered =
    filter === "all" ? manifests : manifests.filter((m) => m.status === filter);
  const activeCount = manifests.filter((m) => m.status === "active").length;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">
            SYNCING_MANIFESTS
          </div>
          <div className="font-mono text-[10px] text-panel2">
            Loading manifest data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Sticky Header */}
        <div className="sticky top-0 z-60 bg-hull border-b border-border-custom">
          {/* Status Filter Tabs */}
          <div className="flex justify-center px-5 py-4 gap-1.5 overflow-x-auto scrollbar-none">
            {[
              {
                key: "all",
                label: `ALL (${manifests.length})`,
                style: "border-amber text-amber bg-amber/8",
              },
              {
                key: "active",
                label: `● ACTIVE (${manifests.filter((m) => m.status === "active").length})`,
                style: "border-green text-green bg-green/8",
              },
              {
                key: "draft",
                label: `◌ DRAFT (${manifests.filter((m) => m.status === "draft").length})`,
                style: "border-blue text-blue bg-blue/8",
              },
              {
                key: "done",
                label: `✓ DONE (${manifests.filter((m) => m.status === "done").length})`,
                style: "border-sand text-sand bg-sand/6",
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`font-mono text-[9px] font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border-[1.5px] whitespace-nowrap cursor-pointer transition-all ${
                  filter === tab.key
                    ? tab.style
                    : "border-border-custom text-sand bg-transparent hover:text-cream hover:border-sand"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Manifest Cards */}
        <div className="px-5 pt-4">
          <SectionLabel right={`${filtered.length} ${filter.toUpperCase()}`}>
            {filter === "all"
              ? "// MANIFESTS //"
              : `// ${filter.toUpperCase()}_MANIFESTS //`}
          </SectionLabel>
          {filtered.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {filtered.map((mft) => (
                <Link
                  key={mft.id}
                  href={`/manifests/${mft.id}`}
                  className="no-underline"
                >
                  <div
                    className={`bg-panel border-[1.5px] border-border-custom rounded-2xl overflow-hidden cursor-pointer hover:border-sand transition-colors relative ${statusColors[mft.status]?.ring || ""} ${statusColors[mft.status]?.border || ""}`}
                  >
                    {/* Left status stripe */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-[3px] ${statusColors[mft.status]?.stripe || "bg-panel2"}`}
                      style={
                        mft.status === "active"
                          ? { boxShadow: "2px 0 8px rgba(120,168,144,0.4)" }
                          : undefined
                      }
                    />

                    <div className="pl-4.5 pr-3.5 pt-3 pb-2 flex items-start gap-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[8px] font-bold tracking-[0.12em] uppercase text-sand mb-0.5">
                          MFT-{mft.id.toUpperCase()}
                        </div>
                        <div className="font-tight text-base font-bold text-cream uppercase tracking-[0.03em] truncate mb-1">
                          {mft.title}
                        </div>
                        <div className="flex gap-1 flex-wrap items-center">
                          <Badge
                            variant={
                              mft.status === "active"
                                ? "green"
                                : mft.status === "draft"
                                  ? "blue"
                                  : "sand"
                            }
                          >
                            {mft.status === "active"
                              ? "● ACTIVE"
                              : mft.status === "draft"
                                ? "◌ DRAFT"
                                : mft.status === "done"
                                  ? "✓ COMPLETE"
                                  : "⊗ ARCHIVED"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-heading text-lg font-bold text-cream block leading-none">
                          {mft.estTotal}
                        </span>
                        <span className="font-mono text-[8px] text-sand block mt-0.5">
                          EST kCr
                        </span>
                        <span
                          className={`font-mono text-[9px] block mt-1 ${mft.status === "done" ? "text-green" : "text-amber"}`}
                        >
                          {mft.confidence}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    {mft.checkedCount > 0 && (
                      <div className="px-3.5 pl-4.5 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] tracking-[0.08em] uppercase text-sand">
                            ITEMS_CHECKED
                          </span>
                          <span className="font-heading text-[10px] font-bold text-cream">
                            {mft.checkedCount}/{mft.items.length}
                          </span>
                        </div>
                        <ProgressBar
                          value={mft.checkedCount}
                          max={mft.checkedCount}
                          color={
                            mft.status === "active"
                              ? "var(--green)"
                              : mft.status === "done"
                                ? "var(--sand)"
                                : "var(--blue)"
                          }
                        />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="text-4xl opacity-30 mb-3">⊘</div>
              <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">
                NO_MANIFESTS_FOUND
              </div>
              <div className="text-xs text-panel2">
                No manifests match the selected filter.
              </div>
            </div>
          )}
        </div>

        {filtered.length === 0 && manifests.length > 0 && (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl opacity-30 mb-3">⊘</div>
            <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">
              NO_MANIFESTS_FOUND
            </div>
            <div className="text-xs text-panel2">
              No manifests match the selected filter.
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={async () => {
          const id = await createManifest(powerSync, userId);
          router.push(`/manifests/${id}`);
        }}
        className="fixed bottom-20 right-5 w-[50px] h-[50px] rounded-3xl bg-amber border-2 border-[#C07830] flex items-center justify-center text-2xl cursor-pointer z-50 text-hull hover:opacity-90 transition-opacity"
        style={{
          boxShadow:
            "inset 0 -3px 0 rgba(0,0,0,0.3), 0 0 24px rgba(217,140,69,0.3)",
        }}
      >
        ＋
      </button>

      <Toast
        icon={toast.icon}
        message={toast.message}
        visible={toast.visible}
        onClose={hideToast}
      />

      <style jsx>{`
        @keyframes activering {
          0% {
            box-shadow: 0 0 0 0 rgba(120, 168, 144, 0.25);
          }
          60% {
            box-shadow: 0 0 0 5px rgba(120, 168, 144, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(120, 168, 144, 0);
          }
        }
      `}</style>
    </div>
  );
}
