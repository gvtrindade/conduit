import { describe, it, expect } from "bun:test";
import { mapDbReceiptToReceipt, RECEIPTS_WITH_MERCHANT_QUERY } from "@/lib/receipt-queries";

describe("Receipt queries", () => {
  it("RECEIPTS_WITH_MERCHANT_QUERY joins merchants", () => {
    expect(RECEIPTS_WITH_MERCHANT_QUERY).toContain("JOIN merchants");
    expect(RECEIPTS_WITH_MERCHANT_QUERY).toContain("merchant_name");
  });

  it("mapDbReceiptToReceipt maps a basic DB row to UI Receipt type", () => {
    const row = {
      id: "uuid-1",
      merchant_name: "SECTOR_7_WHOLE_FOODS",
      receipt_date: "2024-10-14",
      total: 142.2,
      item_count: 12,
      status: "OK",
      savings: 8.4,
      linked_manifest_id: "mft-042",
    };

    const receipt = mapDbReceiptToReceipt(row);

    expect(receipt.id).toBe("uuid-1");
    expect(receipt.merchant).toBe("SECTOR_7_WHOLE_FOODS");
    expect(receipt.total).toBe(142.2);
    expect(receipt.itemCount).toBe(12);
    expect(receipt.status).toBe("OK");
    expect(receipt.savings).toBe(8.4);
    expect(receipt.linkedManifestId).toBe("mft-042");
  });

  it("mapDbReceiptToReceipt formats date from ISO to dotted format", () => {
    const row = {
      id: "1",
      merchant_name: "TEST",
      receipt_date: "2024-10-14T00:00:00Z",
      total: 100,
      item_count: 5,
      status: "OK",
      savings: null,
      linked_manifest_id: null,
    };

    const receipt = mapDbReceiptToReceipt(row);
    expect(receipt.date).toBe("2024.10.14");
  });

  it("mapDbReceiptToReceipt handles null values gracefully", () => {
    const row = {
      id: "1",
      merchant_name: null,
      receipt_date: null,
      total: null,
      item_count: null,
      status: "PND",
      savings: null,
      linked_manifest_id: null,
    };

    const receipt = mapDbReceiptToReceipt(row);
    expect(receipt.merchant).toBe("UNKNOWN");
    expect(receipt.date).toBe("");
    expect(receipt.total).toBe(0);
    expect(receipt.itemCount).toBe(0);
    expect(receipt.status).toBe("PND");
    expect(receipt.savings).toBeUndefined();
    expect(receipt.linkedManifestId).toBeUndefined();
    expect(receipt.items).toEqual([]);
  });

  it("mapDbReceiptToReceipt maps DB status to UI status", () => {
    const statuses = [
      { db: "OK", ui: "OK" },
      { db: "PENDING", ui: "PND" },
      { db: "ERR", ui: "ERR" },
    ];

    for (const { db, ui } of statuses) {
      const row = {
        id: "1",
        merchant_name: "TEST",
        receipt_date: null,
        total: 0,
        item_count: 0,
        status: db,
        savings: null,
        linked_manifest_id: null,
      };

      const receipt = mapDbReceiptToReceipt(row);
      expect(receipt.status).toBe(ui);
    }
  });
});
