import type { Receipt } from "./types";
import { formatDbDate } from "./date";

export const RECEIPTS_WITH_MERCHANT_QUERY = `
  SELECT
    receipts.id,
    merchants.name AS merchant_name,
    receipts.merchant_id,
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
  merchant_id: string | null;
  receipt_date: string | null;
  total: number | null;
  item_count: number | null;
  status: string;
  savings: number | null;
  linked_manifest_id: string | null;
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
    merchantId: row.merchant_id || null,
    date: formatDbDate(row.receipt_date),
    total: Number(row.total) || 0,
    itemCount: Number(row.item_count) || 0,
    status: mapDbStatus(row.status),
    items: [],
    savings: row.savings != null ? Number(row.savings) : undefined,
    linkedManifestId: row.linked_manifest_id || undefined,
  };
}
