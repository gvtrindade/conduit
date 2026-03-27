import type { Receipt } from "./types";

export const RECEIPTS_WITH_MERCHANT_QUERY = `
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
  ORDER BY receipts.receipt_date DESC, receipts.created_at DESC
`;

export interface DbReceiptRow {
  id: string;
  merchant_name: string | null;
  receipt_date: string | null;
  total: number | null;
  item_count: number | null;
  status: string;
  savings: number | null;
  linked_manifest_id: string | null;
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

export function mapDbReceiptToReceipt(row: DbReceiptRow): Receipt {
  return {
    id: row.id,
    merchant: row.merchant_name || "UNKNOWN",
    date: formatDbDate(row.receipt_date),
    total: Number(row.total) || 0,
    itemCount: Number(row.item_count) || 0,
    status: mapDbStatus(row.status),
    items: [],
    savings: row.savings != null ? Number(row.savings) : undefined,
    linkedManifestId: row.linked_manifest_id || undefined,
  };
}
