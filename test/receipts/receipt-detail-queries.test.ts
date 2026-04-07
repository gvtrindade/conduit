import { describe, it, expect } from "bun:test";
import {
  RECEIPT_DETAIL_QUERY,
  RECEIPT_ITEMS_QUERY,
  mapDbReceiptDetailToReceipt,
  mapDbReceiptItemToReceiptItem,
} from "@/lib/receipt-detail-queries";

describe("Receipt detail queries", () => {
  it("RECEIPT_DETAIL_QUERY joins merchants and filters by id", () => {
    expect(RECEIPT_DETAIL_QUERY).toContain("JOIN merchants");
    expect(RECEIPT_DETAIL_QUERY).toContain("WHERE receipts.id = ?");
    expect(RECEIPT_DETAIL_QUERY).toContain("receipts.merchant_id");
  });

  it("RECEIPT_ITEMS_QUERY filters by receipt_id", () => {
    expect(RECEIPT_ITEMS_QUERY).toContain("WHERE receipt_items.receipt_id = ?");
    expect(RECEIPT_ITEMS_QUERY).toContain("receipt_items.id");
    expect(RECEIPT_ITEMS_QUERY).toContain("receipt_items.item_id");
  });

  it("mapDbReceiptDetailToReceipt maps a DB row to UI Receipt type", () => {
    const row = {
      id: "uuid-1",
      merchant_name: "SECTOR_7_WHOLE_FOODS",
      merchant_id: "mrc-001",
      receipt_date: "2024-10-14",
      total: 142.2,
      item_count: 12,
      status: "OK",
      savings: 8.4,
      linked_manifest_id: "mft-042",
    };

    const receipt = mapDbReceiptDetailToReceipt(row);

    expect(receipt.id).toBe("uuid-1");
    expect(receipt.merchant).toBe("SECTOR_7_WHOLE_FOODS");
    expect(receipt.merchantId).toBe("mrc-001");
    expect(receipt.total).toBe(142.2);
    expect(receipt.itemCount).toBe(12);
    expect(receipt.status).toBe("OK");
    expect(receipt.savings).toBe(8.4);
    expect(receipt.linkedManifestId).toBe("mft-042");
  });

  it("mapDbReceiptDetailToReceipt formats date", () => {
    const row = {
      id: "1",
      merchant_name: "TEST",
      merchant_id: "mrc-099",
      receipt_date: "2024-10-14T00:00:00Z",
      total: 100,
      item_count: 5,
      status: "OK",
      savings: null,
      linked_manifest_id: null,
    };

    const receipt = mapDbReceiptDetailToReceipt(row);
    expect(receipt.date).toBe("2024.10.14");
  });

  it("mapDbReceiptDetailToReceipt handles null values", () => {
    const row = {
      id: "1",
      merchant_name: null,
      merchant_id: null,
      receipt_date: null,
      total: null,
      item_count: null,
      status: "PND",
      savings: null,
      linked_manifest_id: null,
    };

    const receipt = mapDbReceiptDetailToReceipt(row);
    expect(receipt.merchant).toBe("UNKNOWN");
    expect(receipt.merchantId).toBeNull();
    expect(receipt.total).toBe(0);
    expect(receipt.itemCount).toBe(0);
    expect(receipt.savings).toBeUndefined();
    expect(receipt.linkedManifestId).toBeUndefined();
  });

  it("mapDbReceiptItemToReceiptItem maps a DB row to UI ReceiptItem type", () => {
    const row = {
      id: "ri-001",
      item_id: "itm-002",
      item_name: "Bananas",
      qty: "1.4kg",
      unit_price: 0.63,
      total: 0.89,
      category_custom: "Produce",
      tags_custom: "ORG,SALE",
    };

    const item = mapDbReceiptItemToReceiptItem(row);

    expect(item.id).toBe("ri-001");
    expect(item.itemId).toBe("itm-002");
    expect(item.name).toBe("Bananas");
    expect(item.qty).toBe("1.4kg");
    expect(item.unitPrice).toBe(0.63);
    expect(item.total).toBe(0.89);
    expect(item.category).toBe("Produce");
    expect(item.tags).toEqual(["ORG", "SALE"]);
  });

  it("mapDbReceiptItemToReceiptItem handles null values", () => {
    const row = {
      id: null,
      item_id: null,
      item_name: null,
      qty: null,
      unit_price: null,
      total: null,
      category_custom: null,
      tags_custom: null,
    };

    const item = mapDbReceiptItemToReceiptItem(row);
    expect(item.id).toBeNull();
    expect(item.itemId).toBeNull();
    expect(item.name).toBe("Unknown Item");
    expect(item.qty).toBe("");
    expect(item.unitPrice).toBe(0);
    expect(item.total).toBe(0);
    expect(item.category).toBe("");
    expect(item.tags).toEqual([]);
  });

  it("mapDbReceiptItemToReceiptItem handles empty tags string", () => {
    const row = {
      id: "ri-003",
      item_id: "itm-004",
      item_name: "Test",
      qty: "1",
      unit_price: 5.0,
      total: 5.0,
      category_custom: "Pantry",
      tags_custom: "",
    };

    const item = mapDbReceiptItemToReceiptItem(row);
    expect(item.tags).toEqual([]);
  });
});
