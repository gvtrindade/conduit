import { describe, it, expect, mock, beforeEach } from "bun:test";

describe("Receipt mutations", () => {
  let mockExecute: ReturnType<typeof mock>;

  beforeEach(() => {
    mockExecute = mock(() => Promise.resolve({ rows: [] }));
  });

  it("createReceipt() generates UUID and INSERTs into receipts table", async () => {
    const { createReceipt } = await import("@/lib/receipt-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      merchant_id: "merchant-uuid",
      receipt_date: "2026-03-15T10:30:00.000Z",
      total: 1250.50,
      item_count: 3,
      status: "PENDING",
      savings: null,
      linked_manifest_id: null,
      processed_at: null,
      created_at: new Date().toISOString(),
    };

    const result = await createReceipt(mockDb, data);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("INSERT INTO receipts");
    expect(sql).toContain("id");
    expect(sql).toContain("merchant_id");
    expect(sql).toContain("receipt_date");
    expect(sql).toContain("total");

    expect(params).toHaveLength(10);
    expect(result).toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
  });

  it("createReceipt() inserts nested receipt_items with receipt_id", async () => {
    const { createReceipt } = await import("@/lib/receipt-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      merchant_id: "merchant-uuid",
      receipt_date: "2026-03-15T10:30:00.000Z",
      total: 1250.50,
      item_count: 2,
      status: "PENDING",
      savings: null,
      linked_manifest_id: null,
      processed_at: null,
      created_at: new Date().toISOString(),
      receipt_items: [
        {
          item_id: "item-uuid-1",
          qty: "2",
          unit_price: 500.25,
          total: 1000.50,
          category_custom: "Food",
          tags_custom: "SALE,ORG",
        },
        {
          item_id: "item-uuid-2",
          qty: "1",
          unit_price: 250.00,
          total: 250.00,
          category_custom: "Supplies",
          tags_custom: "",
        },
      ],
    };

    const result = await createReceipt(mockDb, data);

    expect(mockExecute).toHaveBeenCalledTimes(3);

    const [receiptSql, receiptParams] = mockExecute.mock.calls[0];
    expect(receiptSql).toContain("INSERT INTO receipts");
    const receiptId = receiptParams[0];
    expect(receiptId).toBe(result);

    for (let i = 0; i < 2; i++) {
      const [itemSql, itemParams] = mockExecute.mock.calls[i + 1];
      expect(itemSql).toContain("INSERT INTO receipt_items");
      expect(itemParams[1]).toBe(receiptId);
    }
  });

  it("updateReceipt() generates UPDATE SQL with partial fields", async () => {
    const { updateReceipt } = await import("@/lib/receipt-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "receipt-uuid-123";

    await updateReceipt(mockDb, id, { total: 1500.00, status: "OK" });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("UPDATE receipts");
    expect(sql).toContain("WHERE id = ?");
    expect(sql).toContain("total = ?");
    expect(sql).toContain("status = ?");

    expect(params).toContain(1500.00);
    expect(params).toContain("OK");
    expect(params).toContain(id);
  });

  it("updateReceipt() updates single field", async () => {
    const { updateReceipt } = await import("@/lib/receipt-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "receipt-uuid-456";

    await updateReceipt(mockDb, id, { merchant_id: "new-merchant-uuid" });

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("UPDATE receipts");
    expect(sql).toContain("merchant_id = ?");
    expect(params).toContain("new-merchant-uuid");
    expect(params).toContain(id);
  });

  it("deleteReceipt() generates DELETE SQL", async () => {
    const { deleteReceipt } = await import("@/lib/receipt-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "receipt-uuid-to-delete";

    await deleteReceipt(mockDb, id);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("DELETE FROM receipts");
    expect(sql).toContain("WHERE id = ?");
    expect(params).toContain(id);
  });

  it("checkReceiptExists() returns true when receipt exists", async () => {
    const { checkReceiptExists } = await import("@/lib/receipt-mutations");
    const mockExecuteWithRows = mock(() =>
      Promise.resolve({ rows: [{ count: 1 }] })
    );
    const mockDb = { execute: mockExecuteWithRows } as any;

    const id = "existing-receipt";

    const result = await checkReceiptExists(mockDb, id);

    expect(mockExecuteWithRows).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecuteWithRows.mock.calls[0];

    expect(sql).toContain("SELECT COUNT(*)");
    expect(sql).toContain("FROM receipts");
    expect(sql).toContain("WHERE id = ?");
    expect(params).toContain(id);

    expect(result).toBe(true);
  });

  it("checkReceiptExists() returns false when receipt does not exist", async () => {
    const { checkReceiptExists } = await import("@/lib/receipt-mutations");
    const mockExecuteWithRows = mock(() =>
      Promise.resolve({ rows: [{ count: 0 }] })
    );
    const mockDb = { execute: mockExecuteWithRows } as any;

    const id = "nonexistent-receipt";

    const result = await checkReceiptExists(mockDb, id);

    expect(result).toBe(false);
  });
});
