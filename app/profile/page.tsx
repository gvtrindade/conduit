"use client";

import ModalOverlay, {
  ModalBody,
  ModalHeader,
} from "@/components/modal-overlay";
import PrefillPriceToggle from "@/components/prefill-price-toggle";
import { disconnectDb } from "@/components/providers/SystemProvider";
import SectionLabel from "@/components/section-label";
import Toast, { useToast } from "@/components/toast";
import { authClient } from "@/lib/auth-client";
import {
  acceptCrewRequest,
  rejectCrewRequest,
  removeCrewMember,
  sendCrewRequest,
} from "@/lib/crew-mutations";
import {
  ACCEPTED_CREW_QUERY,
  PENDING_INCOMING_QUERY,
  PENDING_OUTGOING_QUERY,
  type DbAcceptedCrewRow,
  type DbPendingIncomingRow,
  type DbPendingOutgoingRow,
} from "@/lib/crew-queries";
import {
  ITEMS_TRACKED_COUNT_QUERY,
  MISSION_COUNT_QUERY,
  VARIANCE_QUERY,
  type DbItemsTrackedRow,
  type DbMissionCountRow,
  type DbVarianceRow,
} from "@/lib/profile-queries";
import type { UserProfile } from "@/lib/types";
import { usePowerSync, useQuery } from "@powersync/react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function ProfilePage() {
  const { data: session } = authClient.useSession();

  const powerSync = usePowerSync();
  const { toast, showToast, hideToast } = useToast();
  const [callsignInput, setCallsignInput] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string;
    callsign: string;
  } | null>(null);

  const handleLogout = async () => {
    if (!confirm("End session? Local data will be cleared.")) return;
    await authClient.signOut();
    disconnectDb();
  };

  const { data: rawMissionCount, isLoading: missionLoading } =
    useQuery(MISSION_COUNT_QUERY);
  const { data: rawItemsTracked, isLoading: itemsLoading } = useQuery(
    ITEMS_TRACKED_COUNT_QUERY,
  );
  const { data: rawVariance, isLoading: varianceLoading } =
    useQuery(VARIANCE_QUERY);

  const { data: rawCallsign } = useQuery(
    "SELECT callsign FROM users WHERE email = ?",
    [session?.user?.email ?? ""],
  );

  const myEmail = session?.user?.email ?? "";
  const myId = session?.user?.id ?? "";

  const { data: rawPendingIncoming } = useQuery(PENDING_INCOMING_QUERY, [
    myId,
    myId,
  ]);
  const { data: rawPendingOutgoing } = useQuery(PENDING_OUTGOING_QUERY, [
    myId,
    myId,
  ]);
  const { data: rawAcceptedCrew } = useQuery(ACCEPTED_CREW_QUERY, [
    myId,
    myId,
    myId,
    myId,
  ]);
  console.log(rawAcceptedCrew)

  const isLoading = missionLoading || itemsLoading || varianceLoading;

  const userCallsign =
    (rawCallsign as { callsign: string }[])?.[0]?.callsign || null;

  const profile = useMemo((): UserProfile => {
    const missionCount =
      (rawMissionCount as unknown as DbMissionCountRow[])?.[0]?.mission_count ||
      0;
    const itemsTracked =
      (rawItemsTracked as unknown as DbItemsTrackedRow[])?.[0]?.items_tracked ||
      0;
    const variance =
      (rawVariance as unknown as DbVarianceRow[])?.[0]?.avg_variance || 0;
    const name = session?.user?.name || session?.user?.email || "UNKNOWN";
    return {
      name,
      rank: "UNRANKED",
      email: session?.user?.email || "",
      level: 4,
      xp: Math.min(missionCount * 400 + itemsTracked * 50, 10000),
      xpNext: 10000,
      missions: missionCount,
      itemsTracked,
      variance: `${variance >= 0 ? "+" : ""}${variance.toFixed(1)}%`,
    };
  }, [session, rawMissionCount, rawItemsTracked, rawVariance]);

  const initials =
    (userCallsign || profile.name)
      .split(/[\s_-]+/)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">
            SYNCING_DATA
          </div>
          <div className="font-mono text-[10px] text-panel2">
            Loading profile from local store...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Hero Card */}
        <div className="mx-5 mt-4 bg-panel border-2 border-border-custom rounded-2xl overflow-hidden relative">
          {/* Radar bg */}
          <svg
            className="absolute top-0 right-0 w-40 h-40 opacity-[0.06] pointer-events-none"
            viewBox="0 0 160 160"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="var(--amber)"
              strokeWidth="1"
            />
            <circle
              cx="80"
              cy="80"
              r="50"
              fill="none"
              stroke="var(--amber)"
              strokeWidth="1"
            />
            <circle
              cx="80"
              cy="80"
              r="30"
              fill="none"
              stroke="var(--amber)"
              strokeWidth="1"
            />
            <line
              x1="80"
              y1="10"
              x2="80"
              y2="150"
              stroke="var(--amber)"
              strokeWidth="0.6"
            />
            <line
              x1="10"
              y1="80"
              x2="150"
              y2="80"
              stroke="var(--amber)"
              strokeWidth="0.6"
            />
            <path
              d="M80 80 L80 12 A68 68 0 0 1 148 80 Z"
              fill="rgba(217,140,69,0.12)"
            />
          </svg>

          <div className="p-4.5 flex gap-4 items-start relative z-10">
            <div
              className="w-[72px] h-[72px] flex-shrink-0 rounded-2xl border-2 border-amber bg-panel2 flex items-center justify-center text-[26px] font-bold text-cream relative"
              style={{ boxShadow: "0 0 20px rgba(217,140,69,0.2)" }}
            >
              {initials}
              <div
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green rounded-full border-2 border-panel"
                style={{ boxShadow: "0 0 8px #78A890" }}
              />
            </div>
            <div className="flex-1">
              <div className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-amber mb-1">
                // RANK: {profile.rank} //
              </div>
              <div className="font-tight text-[22px] font-bold text-cream uppercase tracking-[0.04em] leading-none mb-1">
                {profile.name}
              </div>
              {userCallsign && (
                <div className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-amber mb-1">
                  CALLSIGN: {userCallsign}
                </div>
              )}
              <div className="text-xs text-sand mb-2">{profile.email}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-border-custom">
            <div className="py-2.5 px-3 text-center border-r border-border-custom">
              <span className="font-heading text-lg font-bold text-cream block leading-none">
                {profile.missions}
              </span>
              <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-sand block mt-1">
                MISSIONS
              </span>
            </div>
            <div className="py-2.5 px-3 text-center border-r border-border-custom">
              <span className="font-heading text-lg font-bold text-cream block leading-none">
                {profile.itemsTracked}
              </span>
              <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-sand block mt-1">
                ITEMS_TRK
              </span>
            </div>
            <div className="py-2.5 px-3 text-center">
              <span className="font-heading text-lg font-bold text-green block leading-none">
                {profile.variance}
              </span>
              <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-sand block mt-1">
                VARIANCE
              </span>
            </div>
          </div>
        </div>

        {/* System Preferences */}
        <div className="px-5 pt-4 pb-3.5">
          <SectionLabel>// SYSTEM_PREFERENCES //</SectionLabel>
          <PrefillPriceToggle />
        </div>

        {/* CREW */}
        {session && (
          <div className="px-5 pt-4 pb-3.5">
            <SectionLabel>// CREW //</SectionLabel>

            {/* Add by callsign */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={callsignInput}
                onChange={(e) => setCallsignInput(e.target.value.toUpperCase())}
                placeholder="ENTER_CALLSIGN"
                className="flex-1 bg-hull border border-border-custom rounded-lg px-3 py-2 font-mono text-[10px] text-cream uppercase tracking-[0.08em] outline-none focus:border-amber placeholder:text-sand/40"
              />
              <button
                onClick={async () => {
                  if (!callsignInput.trim() || !myId) return;
                  try {
                    await sendCrewRequest(
                      powerSync,
                      myId,
                      callsignInput.trim(),
                    );
                    showToast("✓", "CREW_REQUEST_SENT");
                    setCallsignInput("");
                  } catch (e: unknown) {
                    const msg =
                      e instanceof Error ? e.message : "REQUEST_FAILED";
                    showToast("⊗", msg);
                  }
                }}
                className="px-4 py-2 bg-amber border border-[#C07830] rounded-lg font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-hull cursor-pointer hover:opacity-90 transition-opacity"
              >
                SEND
              </button>
            </div>

            {/* Pending outgoing */}
            {(rawPendingOutgoing as unknown as DbPendingOutgoingRow[])?.length >
              0 && (
              <div className="mb-3">
                <div className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-blue mb-1.5">
                  PENDING_OUTGOING
                </div>
                <div className="bg-panel border border-border-custom rounded-xl overflow-hidden">
                  {(
                    rawPendingOutgoing as unknown as DbPendingOutgoingRow[]
                  ).map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border-custom last:border-b-0"
                    >
                      <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream flex-1">
                        {row.target_callsign}
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await removeCrewMember(
                              powerSync,
                              myId,
                              row.user_id_a === myId
                                ? row.user_id_b
                                : row.user_id_a,
                            );
                          } catch {
                            showToast("⊗", "CANCEL_FAILED");
                          }
                        }}
                        className="font-mono text-[9px] text-red border border-red/30 rounded px-2 py-0.5 cursor-pointer hover:bg-red/10 transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending incoming */}
            {(rawPendingIncoming as unknown as DbPendingIncomingRow[])?.length >
              0 && (
              <div className="mb-3">
                <div className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-amber mb-1.5">
                  PENDING_INCOMING
                </div>
                <div className="bg-panel border border-border-custom rounded-xl overflow-hidden">
                  {(
                    rawPendingIncoming as unknown as DbPendingIncomingRow[]
                  ).map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border-custom last:border-b-0"
                    >
                      <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream flex-1">
                        {row.requester_callsign}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={async () => {
                            try {
                              await acceptCrewRequest(
                                powerSync,
                                row.user_id_a,
                                row.user_id_b,
                              );
                              showToast("✓", "CREW_REQUEST_ACCEPTED");
                            } catch {
                              showToast("⊗", "ACCEPT_FAILED");
                            }
                          }}
                          className="font-mono text-[9px] text-green border border-green/30 rounded px-2 py-0.5 cursor-pointer hover:bg-green/10 transition-colors"
                        >
                          ACCEPT
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await rejectCrewRequest(
                                powerSync,
                                row.user_id_a,
                                row.user_id_b,
                              );
                              showToast("✓", "CREW_REQUEST_REJECTED");
                            } catch {
                              showToast("⊗", "REJECT_FAILED");
                            }
                          }}
                          className="font-mono text-[9px] text-red border border-red/30 rounded px-2 py-0.5 cursor-pointer hover:bg-red/10 transition-colors"
                        >
                          REJECT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active crew */}
            {(rawAcceptedCrew as unknown as DbAcceptedCrewRow[])?.length >
              0 && (
              <div>
                <div className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase text-green mb-1.5">
                  CONNECTED_CREW
                </div>
                <div className="bg-panel border border-border-custom rounded-xl overflow-hidden">
                  {(rawAcceptedCrew as unknown as DbAcceptedCrewRow[]).map(
                    (row, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border-custom last:border-b-0"
                      >
                        <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream flex-1">
                          {row.callsign}
                        </span>
                        <button
                          onClick={() =>
                            setRemoveTarget({
                              userId: row.connection_user_id,
                              callsign: row.callsign,
                            })
                          }
                          className="font-mono text-[9px] text-red border border-red/30 rounded px-2 py-0.5 cursor-pointer hover:bg-red/10 transition-colors"
                        >
                          REMOVE
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {(rawAcceptedCrew as unknown as DbAcceptedCrewRow[])?.length ===
              0 &&
              (rawPendingIncoming as unknown as DbPendingIncomingRow[])
                ?.length === 0 &&
              (rawPendingOutgoing as unknown as DbPendingOutgoingRow[])
                ?.length === 0 && (
                <div className="text-center py-6">
                  <div className="font-mono text-[10px] text-sand">
                    NO_CREW_CONNECTIONS
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Danger Zone */}
        <div className="px-5 pb-4">
          <SectionLabel className="!text-red !border-b-red/30">
            // DANGER_ZONE //
          </SectionLabel>
          <div className="bg-red/[0.06] border border-red/30 rounded-xl overflow-hidden">
            {[
              ...(session
                ? [
                    {
                      icon: "🚪",
                      name: "TERMINATE_SESSION",
                      color: "red",
                      action: "logout" as const,
                    },
                  ]
                : [
                    {
                      icon: "🔐",
                      name: "INITIATE_SESSION",
                      color: "amber",
                      action: "login" as const,
                    },
                  ]),
            ].map((action) => (
              <Link
                key={action.name}
                href="/login"
                className="flex items-center gap-3 px-3.5 py-3 border-b border-red/20 last:border-b-0 cursor-pointer"
                onClick={action.action === "logout" ? handleLogout : undefined}
              >
                <span className="text-sm">{action.icon}</span>
                <span
                  className={`font-mono text-[11px] font-bold tracking-[0.08em] uppercase flex-1 text-${action.color}`}
                >
                  {action.name}
                </span>
                <span className="font-mono text-[9px] text-sand">›</span>
              </Link>
            ))}
          </div>
        </div>

        <Toast
          icon={toast.icon}
          message={toast.message}
          visible={toast.visible}
          onClose={hideToast}
        />

        {/* Remove confirm modal */}
        <ModalOverlay
          show={!!removeTarget}
          onClose={() => setRemoveTarget(null)}
        >
          <ModalHeader
            title="CONFIRM_REMOVE"
            onClose={() => setRemoveTarget(null)}
            titleColor="var(--red)"
          />
          <ModalBody>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⊗</div>
              <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-cream mb-2">
                REMOVE_CREW_MEMBER
              </div>
              <div className="font-mono text-[10px] text-sand">
                Remove {removeTarget?.callsign} from your crew? They will also
                be removed from your active manifests.
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveTarget(null)}
                className="flex-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase py-3 border border-border-custom rounded-lg text-sand hover:text-cream hover:border-sand transition-all cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  if (!removeTarget || !myId) return;
                  try {
                    await removeCrewMember(
                      powerSync,
                      myId,
                      removeTarget.userId,
                    );
                    setRemoveTarget(null);
                    showToast("✓", "CREW_MEMBER_REMOVED");
                  } catch {
                    showToast("⊗", "REMOVE_FAILED");
                  }
                }}
                className="flex-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase py-3 bg-red border border-red rounded-lg text-cream hover:bg-red/80 transition-all cursor-pointer"
              >
                REMOVE
              </button>
            </div>
          </ModalBody>
        </ModalOverlay>

        {/* Sign Off */}
        <div className="text-center px-5 pt-5 pb-2">
          <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-sand mb-1">
            CONDUIT // LOGISTICS SYSTEM
          </p>
          <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-sand mb-1">
            BUILD v0.0.1 · SD 2026.04.17
          </p>
          <p className="font-mono text-[8px] tracking-[0.1em] text-panel2">
            CONDUIT SYSTEMS — ALL RIGHTS RESERVED
          </p>
        </div>
      </div>
    </div>
  );
}
