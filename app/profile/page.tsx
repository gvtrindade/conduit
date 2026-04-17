"use client";

import { useMemo, useState } from "react";
import { useQuery, usePowerSync } from "@powersync/react";
import Badge from "@/components/badge";
import SectionLabel from "@/components/section-label";
import ProgressBar from "@/components/progress-bar";
import PrefillPriceToggle from "@/components/prefill-price-toggle";
import { authClient } from "@/lib/auth-client";
import {
  USER_PROFILE_BY_EMAIL_QUERY,
  MISSION_COUNT_QUERY,
  ITEMS_TRACKED_COUNT_QUERY,
  VARIANCE_QUERY,
  mapDbUserToProfile,
  type DbUserRow,
  type DbMissionCountRow,
  type DbItemsTrackedRow,
  type DbVarianceRow,
} from "@/lib/profile-queries";
import { disconnectDb } from "@/components/providers/SystemProvider";

export default function ProfilePage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || null;
  const userEmail = session?.user?.email || "";
  const powerSync = usePowerSync();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      await authClient.signIn.social({ provider: "google" });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("End session? Local data will be cleared.")) return;
    await authClient.signOut();
    disconnectDb();
  };

  const { data: rawUser, isLoading: userLoading } = useQuery(
    USER_PROFILE_BY_EMAIL_QUERY,
    [userEmail],
  );
  const { data: rawMissionCount, isLoading: missionLoading } =
    useQuery(MISSION_COUNT_QUERY);
  const { data: rawItemsTracked, isLoading: itemsLoading } = useQuery(
    ITEMS_TRACKED_COUNT_QUERY,
  );
  const { data: rawVariance, isLoading: varianceLoading } =
    useQuery(VARIANCE_QUERY);

  const isLoading =
    userLoading || missionLoading || itemsLoading || varianceLoading;

  const profile = useMemo(() => {
    const userRow = (rawUser as unknown as DbUserRow[])?.[0];
    const missionCount =
      (rawMissionCount as unknown as DbMissionCountRow[])?.[0]?.mission_count ||
      0;
    const itemsTracked =
      (rawItemsTracked as unknown as DbItemsTrackedRow[])?.[0]?.items_tracked ||
      0;
    const variance =
      (rawVariance as unknown as DbVarianceRow[])?.[0]?.avg_variance || 0;
    return mapDbUserToProfile(userRow, missionCount, itemsTracked, variance);
  }, [rawUser, rawMissionCount, rawItemsTracked, rawVariance]);

  const initials =
    profile.name
      .split(/[\s_-]+/)
      .map((w) => w[0])
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
                : ""),
            ].map((action) => (
              <div
                key={action.name}
                className="flex items-center gap-3 px-3.5 py-3 border-b border-red/20 last:border-b-0 cursor-pointer"
                onClick={() => {
                  if (action.action === "login") handleLogin();
                  if (action.action === "logout") handleLogout();
                }}
              >
                <span className="text-sm">{action.icon}</span>
                <span
                  className={`font-mono text-[11px] font-bold tracking-[0.08em] uppercase flex-1 text-${action.color}`}
                >
                  {action.name}
                </span>
                <span className="font-mono text-[9px] text-sand">›</span>
              </div>
            ))}
          </div>
        </div>

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
