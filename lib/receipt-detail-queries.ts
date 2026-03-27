import type { Receipt, ReceiptItem } from "./types";

export const RECEIPT_DETAIL_QUERY = `
  SELECT
    receipts.id,
    merchants.name AS merchant_name,
    receipts.receipt_date,
    receipts.total,
    receipts.item_count,
    receipts.status,
    receipts.savings,
    receipts.linked_manifest_id
  FROM receipts
  LEFT JOIN merchants ON receipts.merchant_id = merchants.id
  WHERE receipts.id = ?
`;

export const RECEIPT_ITEMS_QUERY = `
  SELECT
    item_name,
    qty,
    unit_price,
    total,
    category_custom,
    tags_custom
  FROM receipt_items
  WHERE receipt_id = ?
`;

export interface DbReceiptDetailRow {
  id: string;
  merchant_name: string | null;
  receipt_date: string | null;
  total: number | null;
  item_count: number | null;
  status: string;
  savings: number | null;
  linked_manifest_id: string | null;
}

export interface DbReceiptItemRow {
  item_name: string | null;
  qty: string | null;
  unit_price: number | null;
  total: number | null;
  category_custom: string | null;
  tags_custom: string | null;
}

function formatDbDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function mapDbStatus(status: string): "OK" | "PND" | "ERR" {
  if (status === "OK") return "OK";
  if (status === "ERR") return "ERR";
  return "PND";
}

export function mapDbReceiptDetailToReceipt(
  row: DbReceiptDetailRow,
  items: ReceiptItem[] = []
): Receipt {
  return {
    id: row.id,
    merchant: row.merchant_name || "UNKNOWN",
    date: formatDbDate(row.receipt_date),
    total: Number(row.total) || 0,
    itemCount: Number(row.item_count) || 0,
    status: mapDbStatus(row.status),
    items,
    savings: row.savings != null ? Number(row.savings) : undefined,
    linkedManifestId: row.linked_manifest_id || undefined,
  };
}

export function mapDbReceiptItemToReceiptItem(
  row: DbReceiptItemRow
): ReceiptItem {
  const tagsStr = row.tags_custom || "";
  const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return {
    name: row.item_name || "Unknown Item",
    qty: row.qty || "",
    unitPrice: Number(row.unit_price) || 0,
    total: Number(row.total) || 0,
    category: row.category_custom || "",
    tags,
  };
}
