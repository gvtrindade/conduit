'use client';

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import Badge from '@/components/badge';
import SectionLabel from '@/components/section-label';
import ProgressBar from '@/components/progress-bar';
import PrefillPriceToggle from '@/components/prefill-price-toggle';
import { useSession } from '@/lib/auth-client';
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
} from '@/lib/profile-queries';

export default function ProfilePage() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || '';

  const { data: rawUser, isLoading: userLoading } = useQuery(
    USER_PROFILE_BY_EMAIL_QUERY,
    [userEmail]
  );
  const { data: rawMissionCount, isLoading: missionLoading } = useQuery(MISSION_COUNT_QUERY);
  const { data: rawItemsTracked, isLoading: itemsLoading } = useQuery(ITEMS_TRACKED_COUNT_QUERY);
  const { data: rawVariance, isLoading: varianceLoading } = useQuery(VARIANCE_QUERY);

  const isLoading = userLoading || missionLoading || itemsLoading || varianceLoading;

  const profile = useMemo(() => {
    const userRow = (rawUser as unknown as DbUserRow[])?.[0];
    const missionCount = (rawMissionCount as unknown as DbMissionCountRow[])?.[0]?.mission_count || 0;
    const itemsTracked = (rawItemsTracked as unknown as DbItemsTrackedRow[])?.[0]?.items_tracked || 0;
    const variance = (rawVariance as unknown as DbVarianceRow[])?.[0]?.avg_variance || 0;
    return mapDbUserToProfile(userRow, missionCount, itemsTracked, variance);
  }, [rawUser, rawMissionCount, rawItemsTracked, rawVariance]);

  const initials = profile.callsign
    .split(/[\s_-]+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-sand mb-2">SYNCING_DATA</div>
          <div className="font-mono text-[10px] text-panel2">Loading profile from local store...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Top Bar */}
        <div className="px-5 py-3 border-b border-border-custom flex items-center justify-between">
          <div className="font-heading text-[13px] font-bold tracking-[0.12em] uppercase text-amber">
            [ OPERATOR <span className="text-sand font-normal">//</span> PROFILE ]
          </div>
        </div>

        {/* Hero Card */}
        <div className="mx-5 mt-4 bg-panel border-2 border-border-custom rounded-2xl overflow-hidden relative">
          {/* Radar bg */}
          <svg className="absolute top-0 right-0 w-40 h-40 opacity-[0.06] pointer-events-none" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
            <circle cx="80" cy="80" r="70" fill="none" stroke="var(--amber)" strokeWidth="1" />
            <circle cx="80" cy="80" r="50" fill="none" stroke="var(--amber)" strokeWidth="1" />
            <circle cx="80" cy="80" r="30" fill="none" stroke="var(--amber)" strokeWidth="1" />
            <line x1="80" y1="10" x2="80" y2="150" stroke="var(--amber)" strokeWidth="0.6" />
            <line x1="10" y1="80" x2="150" y2="80" stroke="var(--amber)" strokeWidth="0.6" />
            <path d="M80 80 L80 12 A68 68 0 0 1 148 80 Z" fill="rgba(217,140,69,0.12)" />
          </svg>

          <div className="p-4.5 flex gap-4 items-start relative z-10">
            <div
              className="w-[72px] h-[72px] flex-shrink-0 rounded-2xl border-2 border-amber bg-panel2 flex items-center justify-center text-[26px] font-bold text-cream relative"
              style={{ boxShadow: '0 0 20px rgba(217,140,69,0.2)' }}
            >
              {initials}
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green rounded-full border-2 border-panel" style={{ boxShadow: '0 0 8px #78A890' }} />
            </div>
            <div className="flex-1">
              <div className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-amber mb-1">// RANK: {profile.rank} //</div>
              <div className="font-tight text-[22px] font-bold text-cream uppercase tracking-[0.04em] leading-none mb-1">{profile.callsign}</div>
              <div className="text-xs text-sand mb-2">{profile.email}</div>
              <div className="flex gap-1.5">
                <span className="font-mono text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm border text-amber border-amber bg-amber/10">CAPTAIN</span>
                <span className="font-mono text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm border text-green border-green bg-green/10">VERIFIED</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-border-custom">
            <div className="py-2.5 px-3 text-center border-r border-border-custom">
              <span className="font-heading text-lg font-bold text-cream block leading-none">{profile.missions}</span>
              <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-sand block mt-1">MISSIONS</span>
            </div>
            <div className="py-2.5 px-3 text-center border-r border-border-custom">
              <span className="font-heading text-lg font-bold text-cream block leading-none">{profile.itemsTracked}</span>
              <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-sand block mt-1">ITEMS_TRK</span>
            </div>
            <div className="py-2.5 px-3 text-center">
              <span className="font-heading text-lg font-bold text-green block leading-none">{profile.variance}</span>
              <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-sand block mt-1">VARIANCE</span>
            </div>
          </div>
        </div>

        {/* Clearance Level */}
        <div className="px-5 pt-4">
          <SectionLabel>// CLEARANCE_LEVEL //</SectionLabel>
          <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
            <div className="bg-hull px-3.5 py-2.5 border-b border-border-custom flex justify-between items-center">
              <span className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-cream">OPERATOR_CLEARANCE_STATUS</span>
              <Badge variant="amber">TIER_IV</Badge>
            </div>
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-heading text-[40px] font-bold text-amber leading-none" style={{ textShadow: '0 0 30px rgba(217,140,69,0.35)' }}>
                  0{profile.level}
                </span>
                <div className="text-right">
                  <span className="font-tight text-lg font-bold text-cream uppercase tracking-[0.04em] block">CAPTAIN</span>
                  <span className="font-mono text-[9px] text-sand tracking-[0.08em] uppercase">PROVISIONING_AUTHORITY</span>
                </div>
              </div>
              <ProgressBar value={profile.xp} max={profile.xpNext} color="linear-gradient(90deg, var(--amber), rgba(217,140,69,0.5))" height="h-2" />
              <div className="flex justify-between mt-1.5 font-mono text-[8px] tracking-[0.08em] uppercase">
                <span className="text-sand">XP: {profile.xp.toLocaleString()} / {profile.xpNext.toLocaleString()}</span>
                <span className="text-amber">▲ {(profile.xpNext - profile.xp).toLocaleString()} TO COMMANDER</span>
              </div>

              {/* Rank Ladder */}
              <div className="flex justify-between mt-3 pt-3 border-t border-border-custom">
                {[
                  { num: 'I', name: 'CREW', active: false },
                  { num: 'II', name: 'ENSIGN', active: false },
                  { num: 'III', name: 'LT', active: false },
                  { num: 'IV', name: 'CAPT', active: true },
                  { num: 'V', name: 'CMDR', active: false, dim: true },
                  { num: 'VI', name: 'ADMIRAL', active: false, dim: true },
                ].map(rank => (
                  <div key={rank.num} className={`text-center ${rank.dim ? 'opacity-35' : rank.active ? '' : 'opacity-50'}`}>
                    <div className={`font-mono text-[8px] ${rank.active ? 'text-amber text-[10px] font-bold' : 'text-sand'}`}>{rank.num}</div>
                    {rank.active && (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber mx-auto mt-1" style={{ boxShadow: '0 0 8px var(--amber)' }} />
                    )}
                    <div className={`font-mono text-[8px] mt-0.5 ${rank.active ? 'text-amber' : 'text-sand'}`}>{rank.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="px-5 pt-4">
          <SectionLabel>// FIELD_ACHIEVEMENTS //</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '🎯', name: 'Budget Sniper', desc: 'Stayed under budget 3 months straight.', progress: 100, color: 'green', status: 'UNLOCKED' },
              { icon: '📦', name: 'Bulk Hauler', desc: 'Single receipt exceeding 200 kCr.', progress: 100, color: 'amber', status: 'UNLOCKED' },
              { icon: '🔭', name: 'Deep Scanner', desc: 'Track 200 unique items.', progress: Math.min(Math.round((profile.itemsTracked / 200) * 100), 100), color: 'blue', status: `${profile.itemsTracked} / 200` },
              { icon: '🛸', name: 'Fleet Admiral', desc: 'Reach Commander rank or above.', progress: 0, color: 'sand', status: 'LOCKED', locked: true },
              { icon: '📉', name: 'Frugal Ops', desc: 'Log a -10% variance in a month.', progress: Math.min(Math.round((Math.abs(parseFloat(profile.variance)) / 10) * 100), 100), color: 'green', status: `${profile.variance} / -10%` },
              { icon: '⚡', name: 'Crisis Pilot', desc: 'Override a receipt anomaly manually.', progress: 0, color: 'sand', status: 'LOCKED', locked: true },
            ].map(ach => (
              <div key={ach.name} className={`bg-panel border border-border-custom rounded-xl p-3 flex flex-col gap-1.5 ${ach.locked ? 'opacity-45' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: `var(--${ach.color})12` }}>
                    {ach.icon}
                  </div>
                  <div className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-cream leading-tight">{ach.name}</div>
                </div>
                <div className="text-[11px] text-sand leading-relaxed">{ach.desc}</div>
                <div className="font-mono text-[8px] text-sand mb-0.5">{ach.status}</div>
                <ProgressBar value={ach.progress} color={`var(--${ach.color})`} height="h-1" />
              </div>
            ))}
          </div>
        </div>

        {/* System Preferences */}
        <div className="px-5 pt-4 pb-3.5">
          <SectionLabel>// SYSTEM_PREFERENCES //</SectionLabel>
          <div className="bg-panel border-2 border-border-custom rounded-xl overflow-hidden">
            {[
              { icon: '🌍', name: 'Base Currency', sub: 'kCr // Kilocredits', val: 'kCr', valColor: 'blue' },
              { icon: '🔔', name: 'Price Alerts', sub: 'Threshold: ±15%', val: 'ON', valColor: 'green' },
              { icon: '📅', name: 'Budget Cycle', sub: 'Resets on 1st of month', val: 'MONTHLY', valColor: 'blue' },
              { icon: '🤖', name: 'AI Intel Mode', sub: 'Anomaly detection active', val: 'ON', valColor: 'green' },
            ].map(pref => (
              <div key={pref.name} className="flex items-center justify-between px-3.5 py-3 border-b border-border-custom last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-hull border border-border-custom flex items-center justify-center text-sm">{pref.icon}</div>
                  <div>
                    <div className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-cream">{pref.name}</div>
                    <div className="font-mono text-[9px] text-sand mt-0.5 tracking-wider">{pref.sub}</div>
                  </div>
                </div>
                <span className={`font-mono text-[10px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 rounded border ${
                  pref.valColor === 'green' ? 'text-green border-green/30 bg-green/8' : 'text-blue border-blue/30 bg-blue/10'
                }`}>
                  {pref.val}
                </span>
              </div>
            ))}
            <PrefillPriceToggle />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="px-5 pb-4">
          <SectionLabel className="!text-red !border-b-red/30">// DANGER_ZONE //</SectionLabel>
          <div className="bg-red/[0.06] border border-red/30 rounded-xl overflow-hidden">
            {[
              { icon: '📤', name: 'EXPORT_ALL_LOGS', color: 'amber' },
              { icon: '🔄', name: 'RESET_BUDGET_CYCLE', color: 'amber' },
              { icon: '💀', name: 'PURGE_ALL_MANIFESTS', color: 'red' },
              { icon: '🚪', name: 'TERMINATE_SESSION', color: 'red' },
            ].map(action => (
              <div key={action.name} className="flex items-center gap-3 px-3.5 py-3 border-b border-red/20 last:border-b-0 cursor-pointer">
                <span className="text-sm">{action.icon}</span>
                <span className={`font-mono text-[11px] font-bold tracking-[0.08em] uppercase flex-1 text-${action.color}`}>{action.name}</span>
                <span className="font-mono text-[9px] text-sand">›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign Off */}
        <div className="text-center px-5 pt-5 pb-2">
          <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-sand mb-1">CONDUIT // LOGISTICS SYSTEM</p>
          <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-sand mb-1">BUILD v2.4.1 · SD 2024.10.14</p>
          <p className="font-mono text-[8px] tracking-[0.1em] text-panel2">CONDUIT SYSTEMS — ALL RIGHTS RESERVED</p>
        </div>
      </div>
    </div>
  );
}
