import { describe, it, expect, mock } from "bun:test";

describe("addReceiptItem", () => {
  it("inserts a receipt item with provided values", async () => {
    const mockExecute = mock(() => Promise.resolve({ rows: [] }));
    const mockDb = { execute: mockExecute } as any;

    const { addReceiptItem } = await import("@/lib/receipt-item-mutations");

    await addReceiptItem(mockDb, {
      receiptId: "rcpt-1",
      itemId: "item-42",
      qty: "2",
      unitPrice: 150,
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("INSERT INTO receipt_items");
    expect(params).toContain("rcpt-1");
    expect(params).toContain("item-42");
    expect(params).toContain("2");
    expect(params).toContain(150);
  });

  it("pre-fills unit_price from items.last_price when preference is enabled", async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const mockExecute = mock((sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (sql.includes("SELECT") && sql.includes("preferences")) {
        return Promise.resolve({ rows: [{ preferences: JSON.stringify({ prefill_price: true }) }] });
      }
      if (sql.includes("SELECT") && sql.includes("last_price")) {
        return Promise.resolve({ rows: [{ last_price: 175 }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const mockDb = { execute: mockExecute } as any;

    const { addReceiptItem } = await import("@/lib/receipt-item-mutations");

    await addReceiptItem(mockDb, {
      receiptId: "rcpt-1",
      itemId: "item-42",
      qty: "1",
    });

    expect(calls.length).toBe(3);
    const insertCall = calls[2];
    expect(insertCall.sql).toContain("INSERT INTO receipt_items");
    expect(insertCall.params).toContain(175);
  });

  it("does not pre-fill price when preference is disabled", async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const mockExecute = mock((sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (sql.includes("SELECT") && sql.includes("preferences")) {
        return Promise.resolve({ rows: [{ preferences: JSON.stringify({ prefill_price: false }) }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const mockDb = { execute: mockExecute } as any;

    const { addReceiptItem } = await import("@/lib/receipt-item-mutations");

    await addReceiptItem(mockDb, {
      receiptId: "rcpt-1",
      itemId: "item-42",
      qty: "1",
    });

    expect(calls.length).toBe(2);
    const insertCall = calls[1];
    expect(insertCall.sql).toContain("INSERT INTO receipt_items");
    expect(insertCall.params).toContain(null);
  });

  it("does not pre-fill price when no unitPrice provided and no item_id", async () => {
    const mockExecute = mock(() => Promise.resolve({ rows: [] }));
    const mockDb = { execute: mockExecute } as any;

    const { addReceiptItem } = await import("@/lib/receipt-item-mutations");

    await addReceiptItem(mockDb, {
      receiptId: "rcpt-1",
      itemId: null,
      qty: "1",
      unitPrice: 0,
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

describe("updateReceiptItem", () => {
  it("updates qty field", async () => {
    const mockExecute = mock(() => Promise.resolve({ rows: [] }));
    const mockDb = { execute: mockExecute } as any;

    const { updateReceiptItem } = await import("@/lib/receipt-item-mutations");

    await updateReceiptItem(mockDb, "row-1", { qty: "5" });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("UPDATE receipt_items");
    expect(sql).toContain("qty = ?");
    expect(params).toContain("5");
    expect(params).toContain("row-1");
  });

  it("updates unit_price field", async () => {
    const mockExecute = mock(() => Promise.resolve({ rows: [] }));
    const mockDb = { execute: mockExecute } as any;

    const { updateReceiptItem } = await import("@/lib/receipt-item-mutations");

    await updateReceiptItem(mockDb, "row-1", { unitPrice: 200 });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("unit_price = ?");
    expect(params).toContain(200);
  });

  it("updates multiple fields at once", async () => {
    const mockExecute = mock(() => Promise.resolve({ rows: [] }));
    const mockDb = { execute: mockExecute } as any;

    const { updateReceiptItem } = await import("@/lib/receipt-item-mutations");

    await updateReceiptItem(mockDb, "row-1", { qty: "3", unitPrice: 100 });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toContain("qty = ?");
    expect(sql).toContain("unit_price = ?");
  });

  it("recalculates total when qty or unitPrice changes", async () => {
    const mockExecute = mock(() => Promise.resolve({ rows: [] }));
    const mockDb = { execute: mockExecute } as any;

    const { updateReceiptItem } = await import("@/lib/receipt-item-mutations");

    await updateReceiptItem(mockDb, "row-1", { qty: "4", unitPrice: 50 });

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("total = ?");
    expect(params).toContain(200);
  });
});

describe("deleteReceiptItem", () => {
  it("deletes a receipt item by id", async () => {
    const mockExecute = mock(() => Promise.resolve({ rows: [] }));
    const mockDb = { execute: mockExecute } as any;

    const { deleteReceiptItem } = await import("@/lib/receipt-item-mutations");

    await deleteReceiptItem(mockDb, "row-1");

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("DELETE FROM receipt_items");
    expect(params).toContain("row-1");
  });
});
