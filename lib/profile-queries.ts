import type { UserProfile } from "./types";

// Query to get current user profile (by email match from session)
// Note: In PowerSync, we query the synced users table
// The current user is identified by matching email with the auth session
export const USER_PROFILE_BY_EMAIL_QUERY = `
  SELECT
    users.id,
    users.name,
    users.email,
    users.rank,
    users.role,
    users.color
  FROM users
  WHERE users.email = ?
  LIMIT 1
`;

export interface DbUserRow {
  id: string;
  name: string | null;
  email: string | null;
  rank: string | null;
  role: string | null;
  color: string | null;
}

// Query to get mission count (manifests)
export const MISSION_COUNT_QUERY = `
  SELECT COUNT(*) as mission_count
  FROM manifests
  WHERE status IN ('DONE', 'ARCHIVED')
`;

export interface DbMissionCountRow {
  mission_count: number;
}

// Query to get items tracked count
export const ITEMS_TRACKED_COUNT_QUERY = `
  SELECT COUNT(*) as items_tracked
  FROM items
`;

export interface DbItemsTrackedRow {
  items_tracked: number;
}

// Query to get average variance (simplified - just average savings percentage)
export const VARIANCE_QUERY = `
  SELECT
    COALESCE(AVG(
      CASE
        WHEN total > 0 THEN (savings / total) * 100
        ELSE 0
      END
    ), 0) as avg_variance
  FROM receipts
  WHERE status = 'OK' AND savings IS NOT NULL
`;

export interface DbVarianceRow {
  avg_variance: number;
}

export function mapDbUserToProfile(
  userRow: DbUserRow | undefined,
  missionCount: number,
  itemsTracked: number,
  variance: number
): UserProfile {
  return {
    name: userRow?.name || 'UNKNOWN',
    rank: userRow?.rank || 'UNRANKED',
    email: userRow?.email || '',
    level: 4, // Gamification placeholder
    xp: Math.min(missionCount * 400 + itemsTracked * 50, 10000), // Calculated from activity
    xpNext: 10000,
    missions: missionCount,
    itemsTracked,
    variance: `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`,
  };
}
