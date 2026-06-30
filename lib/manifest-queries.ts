import type { Manifest, ManifestItem, CrewMember } from "./types";

export const MANIFESTS_LIST_QUERY = `
  SELECT
    manifests.id,
    manifests.title,
    manifests.type,
    manifests.status,
    manifests.est_total,
    manifests.confidence,
    manifests.checked_count,
    manifests.created_by,
    manifests.created_at,
    manifests.updated_at,
    (SELECT COUNT(*) FROM manifest_items WHERE manifest_items.manifest_id = manifests.id) AS item_count,
    (SELECT COUNT(*) FROM manifest_crew WHERE manifest_crew.manifest_id = manifests.id) AS crew_count,
    (SELECT callsign FROM users WHERE users.id = manifests.created_by) AS created_by_callsign
  FROM manifests
  ORDER BY
    CASE manifests.status
      WHEN 'ACTIVE' THEN 0
      WHEN 'DRAFT' THEN 1
      WHEN 'DONE' THEN 2
      WHEN 'ARCHIVED' THEN 3
    END,
    manifests.updated_at DESC
`;

export const MANIFEST_DETAIL_QUERY = `
  SELECT
    manifests.id,
    manifests.title,
    manifests.type,
    manifests.status,
    manifests.est_total,
    manifests.confidence,
    manifests.checked_count,
    manifests.created_by,
    manifests.created_at,
    manifests.updated_at
  FROM manifests
  WHERE manifests.id = ?
`;

export const MANIFEST_ITEMS_QUERY = `
  SELECT
    id,
    manifest_id,
    item_id,
    item_name,
    checked,
    prev_price,
    location,
    is_unknown
  FROM manifest_items
  WHERE manifest_id = ?
`;

export const MANIFEST_CREW_QUERY = `
  SELECT
    manifest_crew.manifest_id,
    manifest_crew.user_id,
    manifest_crew.role,
    users.callsign,
    users.color
  FROM manifest_crew
  JOIN users ON manifest_crew.user_id = users.id
  WHERE manifest_crew.manifest_id = ?

  UNION

  SELECT
    m.id AS manifest_id,
    m.created_by AS user_id,
    'COMMANDER' AS role,
    u.callsign,
    u.color
  FROM manifests m
  JOIN users u ON u.id = m.created_by
  WHERE m.id = ?
    AND m.created_by NOT IN (
      SELECT user_id FROM manifest_crew WHERE manifest_id = ?
    )
`;

export interface DbManifestListRow {
  id: string;
  title: string | null;
  type: string | null;
  status: string;
  est_total: number | null;
  confidence: string | null;
  checked_count: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  item_count: number;
  crew_count: number;
  created_by_callsign: string | null;
}

export interface DbManifestDetailRow {
  id: string;
  title: string | null;
  type: string | null;
  status: string;
  est_total: number | null;
  confidence: string | null;
  checked_count: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DbManifestItemRow {
  id: string;
  manifest_id: string;
  item_id: string | null;
  item_name: string | null;
  checked: number;
  prev_price: number | null;
  location: string | null;
  is_unknown: number;
}

export interface DbManifestCrewRow {
  manifest_id: string;
  user_id: string;
  role: string | null;
  callsign: string;
  color: string | null;
}

function mapStatus(status: string): "active" | "draft" | "done" | "archived" {
  const s = status.toLowerCase();
  if (s === "active") return "active";
  if (s === "draft") return "draft";
  if (s === "done") return "done";
  return "archived";
}

export function mapDbManifestToManifestListItem(
  row: DbManifestListRow
): Manifest {
  return {
    id: row.id,
    title: row.title || "",
    type: row.type || "",
    status: mapStatus(row.status),
    estTotal: Number(row.est_total) || 0,
    confidence: row.confidence || "",
    items: [],
    crew: [],
    lastModified: "",
    checkedCount: Number(row.checked_count) || 0,
    createdBy: row.created_by,
    createdByCallsign: row.created_by_callsign || undefined,
  };
}

export function mapDbManifestDetailToManifest(
  row: DbManifestDetailRow,
  items: ManifestItem[] = [],
  crew: CrewMember[] = []
): Manifest {
  return {
    id: row.id,
    title: row.title || "",
    type: row.type || "",
    status: mapStatus(row.status),
    estTotal: Number(row.est_total) || 0,
    confidence: row.confidence || "",
    items,
    crew,
    lastModified: "",
    checkedCount: Number(row.checked_count) || 0,
    createdBy: row.created_by,
  };
}

export function mapDbManifestItemToManifestItem(
  row: DbManifestItemRow
): ManifestItem {
  return {
    id: row.id,
    itemId: row.item_id || null,
    name: row.item_name || "Unknown Item",
    checked: row.checked === 1,
    prevPrice: row.prev_price != null ? Number(row.prev_price) : null,
    location: row.location || null,
    unknown: row.is_unknown === 1,
  };
}

export function deriveInitials(name: string): string {
  return name
    .split("_")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function mapDbCrewToCrewMember(
  row: DbManifestCrewRow
): CrewMember {
  return {
    initials: deriveInitials(row.callsign),
    callsign: row.callsign,
    role: row.role || "",
    color: row.color || "#2A3848",
    badge: row.role === "COMMANDER" ? "COMMANDER" : "OPERATOR",
    id: row.user_id,
  };
}
