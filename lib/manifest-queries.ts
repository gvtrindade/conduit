import type { Manifest, ManifestItem, CrewMember } from "./types";

export const MANIFESTS_LIST_QUERY = `
  SELECT
    manifests.id,
    manifests.title,
    manifests.status,
    manifests.merchant_name,
    manifests.items,
    manifests.created_by,
    manifests.created_at,
    manifests.updated_at,
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
    manifests.status,
    manifests.merchant_name,
    manifests.items,
    manifests.created_by,
    manifests.created_at,
    manifests.updated_at
  FROM manifests
  WHERE manifests.id = ?
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

// Catalog items query (for add-items modal)
export const CATALOG_ITEMS_QUERY = `
  SELECT
    id,
    name,
    category,
    user_id,
    created_at,
    updated_at
  FROM manifest_items
  WHERE user_id = ?
  ORDER BY name ASC
`;

// Merchant aisles query
export const MERCHANT_AISLES_QUERY = `
  SELECT
    id,
    merchant_id,
    category,
    "order",
    user_id,
    created_at
  FROM merchant_aisles
  WHERE merchant_id = ?
  ORDER BY "order" ASC
`;

// Merchant item rules query
export const MERCHANT_ITEM_RULES_QUERY = `
  SELECT
    id,
    merchant_id,
    manifest_item_id,
    category,
    "order",
    user_id,
    created_at
  FROM merchant_item_rules
  WHERE merchant_id = ?
  ORDER BY "order" ASC
`;

// Merchants list query
// Note: we import from lib/types for Merchant but query raw from PowerSync
export const MERCHANTS_LIST_QUERY = `
  SELECT
    id,
    name,
    emoji,
    user_id,
    created_at
  FROM merchants
  WHERE user_id = ?
  ORDER BY name ASC
`;

export interface DbMerchantListRow {
  id: string;
  name: string;
  emoji: string | null;
  user_id: string;
  created_at: string | null;
}

// Receipts for a specific merchant
export const MERCHANT_RECEIPTS_QUERY = `
  SELECT
    receipts.id,
    receipts.merchant_id,
    receipts.receipt_date,
    receipts.total,
    receipts.item_count,
    receipts.status,
    receipts.created_at
  FROM receipts
  WHERE receipts.merchant_id = ? AND receipts.user_id = ?
  ORDER BY receipts.receipt_date DESC, receipts.created_at DESC
`;

export interface DbMerchantReceiptRow {
  id: string;
  merchant_id: string;
  receipt_date: string | null;
  total: number | null;
  item_count: number | null;
  status: string;
  created_at: string | null;
}

// Distinct categories from merchant_aisles (for dropdown)
export const MERCHANT_CATEGORIES_QUERY = `
  SELECT DISTINCT category
  FROM merchant_aisles
  WHERE user_id = ?
  ORDER BY category ASC
`;

export interface DbManifestListRow {
  id: string;
  title: string | null;
  status: string;
  merchant_name: string | null;
  items: string; // JSON string from PowerSync
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  crew_count: number;
  created_by_callsign: string | null;
}

export interface DbManifestDetailRow {
  id: string;
  title: string | null;
  status: string;
  merchant_name: string | null;
  items: string; // JSON string from PowerSync
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DbManifestCrewRow {
  manifest_id: string;
  user_id: string;
  role: string | null;
  callsign: string;
  color: string | null;
}

export interface DbCatalogItemRow {
  id: string;
  name: string;
  category: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbMerchantAisleRow {
  id: string;
  merchant_id: string;
  category: string;
  order: number;
  user_id: string;
  created_at: string;
}

export interface DbMerchantItemRuleRow {
  id: string;
  merchant_id: string;
  manifest_item_id: string;
  category: string;
  order: number;
  user_id: string;
  created_at: string;
}

function mapStatus(status: string): "active" | "draft" | "done" | "archived" {
  const s = status.toLowerCase();
  if (s === "active") return "active";
  if (s === "draft") return "draft";
  if (s === "done") return "done";
  return "archived";
}

// Parse items JSON blob
export function parseManifestItems(itemsJson: string | null | undefined): ManifestItem[] {
  if (!itemsJson) return [];
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mapDbManifestToManifestListItem(
  row: DbManifestListRow
): Manifest {
  const items = parseManifestItems(row.items);
  const checkedCount = items.filter(i => i.checked).length;
  const estTotal = items.reduce((sum, i) => {
    const cost = parseFloat(i.estimated_cost || "0");
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);

  return {
    id: row.id,
    title: row.title || "",
    status: mapStatus(row.status),
    merchantName: row.merchant_name,
    items,
    crew: [],
    lastModified: row.updated_at || "",
    createdBy: row.created_by,
    createdByCallsign: row.created_by_callsign || undefined,
  };
}

export function mapDbManifestDetailToManifest(
  row: DbManifestDetailRow,
  crew: CrewMember[] = []
): Manifest {
  const items = parseManifestItems(row.items);
  return {
    id: row.id,
    title: row.title || "",
    status: mapStatus(row.status),
    merchantName: row.merchant_name,
    items,
    crew,
    lastModified: row.updated_at || "",
    createdBy: row.created_by,
  };
}

export function mapDbCatalogItem(row: DbCatalogItemRow): {
  id: string;
  name: string;
  category: string | null;
} {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
  };
}

export function mapDbMerchantAisle(row: DbMerchantAisleRow): {
  id: string;
  merchant_id: string;
  category: string;
  order: number;
} {
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    category: row.category,
    order: row.order,
  };
}

export function mapDbMerchantItemRule(row: DbMerchantItemRuleRow): {
  id: string;
  merchant_id: string;
  manifest_item_id: string;
  category: string;
  order: number;
} {
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    manifest_item_id: row.manifest_item_id,
    category: row.category,
    order: row.order,
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
