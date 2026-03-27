import type { KPI, CategorySpend, MerchantRank } from "./types";

// KPI Query: Total spend, average receipt, receipt count
export const KPI_QUERY = `
  SELECT
    COALESCE(SUM(total), 0) as total_spend,
    COALESCE(AVG(total), 0) as avg_receipt,
    COUNT(*) as receipt_count
  FROM receipts
  WHERE status = 'OK'
`;

export interface DbKpiRow {
  total_spend: number;
  avg_receipt: number;
  receipt_count: number;
}

// Items tracked query
export const ITEMS_TRACKED_QUERY = `
  SELECT COUNT(DISTINCT item_id) as items_tracked
  FROM receipt_items
`;

export interface DbItemsTrackedRow {
  items_tracked: number;
}

// Category spend query: Join receipt_items with items to get category info
export const CATEGORY_SPEND_QUERY = `
  SELECT
    COALESCE(i.category_custom, ri.category_custom, 'uncategorized') as category_name,
    COALESCE(i.emoji, '📦') as emoji,
    COALESCE(SUM(ri.total), 0) as total_amount
  FROM receipt_items ri
  LEFT JOIN items i ON ri.item_id = i.id
  GROUP BY category_name
  ORDER BY total_amount DESC
`;

export interface DbCategorySpendRow {
  category_name: string;
  emoji: string;
  total_amount: number;
}

// Merchant rankings query: Join receipts with merchants
export const MERCHANT_RANKINGS_QUERY = `
  SELECT
    COALESCE(m.name, 'UNKNOWN') as merchant_name,
    COUNT(*) as visit_count,
    COALESCE(SUM(r.total), 0) as total_amount
  FROM receipts r
  LEFT JOIN merchants m ON r.merchant_id = m.id
  WHERE r.status = 'OK'
  GROUP BY merchant_name
  ORDER BY total_amount DESC
  LIMIT 5
`;

export interface DbMerchantRankRow {
  merchant_name: string;
  visit_count: number;
  total_amount: number;
}

// Category color mapping
const categoryColors: Record<string, string> = {
  grocery: 'var(--green)',
  provisions: 'var(--green)',
  produce: 'var(--green)',
  dairy: 'var(--green)',
  protein: 'var(--green)',
  pantry: 'var(--amber)',
  household: 'var(--blue)',
  house: 'var(--blue)',
  beverages: 'var(--amber)',
  bev: 'var(--amber)',
  health: 'var(--red)',
  uncategorized: 'var(--sand)',
};

// Category name display mapping
const categoryDisplayNames: Record<string, string> = {
  grocery: 'Provisions (Grocery)',
  provisions: 'Provisions (Grocery)',
  produce: 'Provisions (Grocery)',
  dairy: 'Provisions (Grocery)',
  protein: 'Provisions (Grocery)',
  pantry: 'Provisions (Grocery)',
  household: 'Hull Supplies (House)',
  house: 'Hull Supplies (House)',
  beverages: 'Tech Components',
  bev: 'Tech Components',
  health: 'Emergency Rations',
  uncategorized: 'Uncategorized',
};

export function mapDbCategoryToCategorySpend(
  row: DbCategorySpendRow,
  totalSpend: number
): CategorySpend {
  const catLower = row.category_name.toLowerCase();
  const displayCategory = categoryDisplayNames[catLower] || row.category_name;
  const color = categoryColors[catLower] || 'var(--sand)';
  const pct = totalSpend > 0 ? Math.round((row.total_amount / totalSpend) * 100) : 0;

  return {
    name: displayCategory,
    emoji: row.emoji,
    amount: Math.round(row.total_amount),
    pct,
    color,
  };
}

export function mapDbMerchantToMerchantRank(row: DbMerchantRankRow): MerchantRank {
  return {
    name: row.merchant_name.toUpperCase().replace(/\s+/g, '_'),
    visits: row.visit_count,
    amount: Math.round(row.total_amount),
  };
}

export function mapDbKpiToKpis(kpiRow: DbKpiRow, itemsTracked: number): KPI[] {
  const totalSpend = Math.round(kpiRow.total_spend);
  const avgReceipt = Math.round(kpiRow.avg_receipt);

  return [
    {
      label: 'TOTAL_OPS',
      value: totalSpend.toLocaleString(),
      delta: '',
      deltaType: 'warn' as const,
    },
    {
      label: 'AVG_SORTIE',
      value: avgReceipt.toLocaleString(),
      delta: '',
      deltaType: 'pos' as const,
    },
    {
      label: 'ITEMS_TRACKED',
      value: itemsTracked.toLocaleString(),
      delta: '',
      deltaType: 'warn' as const,
    },
  ];
}
