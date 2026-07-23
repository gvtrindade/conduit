"use client";

import SectionLabel from "@/components/section-label";
import Toast, { useToast } from "@/components/toast";
import TopNav from "@/components/top-nav";
import { createMerchant } from "@/lib/merchant-mutations";
import {
  MERCHANTS_LIST_QUERY,
  type DbMerchantListRow,
} from "@/lib/manifest-queries";
import { authClient } from "@/lib/auth-client";
import { usePowerSync, useQuery } from "@powersync/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function MerchantsPage() {
  const router = useRouter();
  const powerSync = usePowerSync();
  const { toast, showToast, hideToast } = useToast();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? null;

  const { data: rawMerchants, isLoading } = useQuery(MERCHANTS_LIST_QUERY, [
    userId ?? "",
  ]);

  const merchants = useMemo(
    () => (rawMerchants as unknown as DbMerchantListRow[]) || [],
    [rawMerchants],
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || !userId || isCreating) return;
    setIsCreating(true);
    try {
      const id = await createMerchant(powerSync, {
        name: newName.trim().toUpperCase(),
        emoji: null,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
      setNewName("");
      setShowAddForm(false);
      showToast("✓", "MERCHANT_CREATED");
      // Navigate after a brief delay to let the toast render
      setTimeout(() => router.push(`/merchants/${id}`), 300);
    } catch (err) {
      console.error("Failed to create merchant:", err);
      showToast("⊗", `FAILED: ${err instanceof Error ? err.message : "UNKNOWN"}`);
      setIsCreating(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col">
      <TopNav backHref="/profile" backLabel="" title="MERCHANTS" />

      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div className="px-5 pt-4">
          <SectionLabel right={`${merchants.length} REGISTERED`}>
            // MERCHANTS //
          </SectionLabel>

          {merchants.length > 0 ? (
            <div className="flex flex-col gap-2">
              {merchants.map((m) => (
                <Link
                  key={m.id}
                  href={`/merchants/${m.id}`}
                  className="no-underline"
                >
                  <div className="bg-panel border-[1.5px] border-border-custom rounded-xl px-3.5 py-3 flex items-center gap-3 cursor-pointer hover:border-sand transition-colors">
                    <span className="text-lg">{m.emoji || "🏪"}</span>
                    <span className="flex-1 font-tight text-base font-bold text-cream uppercase tracking-[0.03em]">
                      {m.name}
                    </span>
                    <span className="font-mono text-sm text-sand">›</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="text-4xl opacity-30 mb-3">🏪</div>
              <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-1">
                NO_MERCHANTS
              </div>
              <div className="text-xs text-panel2">
                Create a merchant to organize your aisles and rules.
              </div>
            </div>
          )}
        </div>

        {showAddForm ? (
          <div className="px-5 pt-4">
            <div className="bg-panel border-[1.5px] border-amber/40 rounded-xl p-4">
              <div className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-amber mb-2">
                // NEW_MERCHANT //
              </div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                placeholder="MERCHANT_NAME"
                className="w-full bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber placeholder:text-sand/40 mb-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowAddForm(false);
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewName("");
                  }}
                  className="flex-1 py-2 border border-border-custom rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || isCreating}
                  className="flex-1 py-2 bg-amber border border-[#C07830] rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-hull cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isCreating ? "CREATING..." : "CREATE"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-4 pb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-transparent border-[1.5px] border-dashed border-amber/35 rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer hover:border-amber hover:bg-amber/5 transition-all"
            >
              <span className="font-mono text-base">＋</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-amber">
                ADD_MERCHANT
              </span>
            </button>
          </div>
        )}
      </div>

      <Toast
        icon={toast.icon}
        message={toast.message}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}
