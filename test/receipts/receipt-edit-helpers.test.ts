import { describe, it, expect, mock } from "bun:test";
import { computeItemDiff, saveReceiptEdits } from "@/lib/receipt-edit-helpers";

describe("computeItemDiff", () => {
  const originalItems = [
    { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
    { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
    { receiptItemId: "ri3", qty: "3", unitPrice: 1.00 },
  ];

  it("returns empty diff when nothing changed", () => {
    const submitted = [
      { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
      { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
      { receiptItemId: "ri3", qty: "3", unitPrice: 1.00 },
    ];

    const result = computeItemDiff(originalItems, submitted);

    expect(result.deletedIds).toEqual([]);
    expect(result.updatedItems).toEqual([]);
    expect(result.newItems).toEqual([]);
  });

  it("detects removed items", () => {
    const submitted = [
      { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
    ];

    const result = computeItemDiff(originalItems, submitted);

    expect(result.deletedIds).toEqual(["ri2", "ri3"]);
    expect(result.updatedItems).toEqual([]);
    expect(result.newItems).toEqual([]);
  });

  it("detects items with changed quantity", () => {
    const submitted = [
      { receiptItemId: "ri1", qty: "5", unitPrice: 5.50 },
      { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
      { receiptItemId: "ri3", qty: "3", unitPrice: 1.00 },
    ];

    const result = computeItemDiff(originalItems, submitted);

    expect(result.deletedIds).toEqual([]);
    expect(result.updatedItems).toEqual([
      { receiptItemId: "ri1", qty: "5", unitPrice: 5.50 },
    ]);
    expect(result.newItems).toEqual([]);
  });

  it("detects items with changed price", () => {
    const submitted = [
      { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
      { receiptItemId: "ri2", qty: "1", unitPrice: 4.00 },
      { receiptItemId: "ri3", qty: "3", unitPrice: 1.00 },
    ];

    const result = computeItemDiff(originalItems, submitted);

    expect(result.deletedIds).toEqual([]);
    expect(result.updatedItems).toEqual([
      { receiptItemId: "ri2", qty: "1", unitPrice: 4.00 },
    ]);
    expect(result.newItems).toEqual([]);
  });

  it("detects new items (receiptItemId is empty)", () => {
    const submitted = [
      { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
      { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
      { receiptItemId: "ri3", qty: "3", unitPrice: 1.00 },
      { receiptItemId: "", itemId: "i4", qty: "1", unitPrice: 7.00 },
    ];

    const result = computeItemDiff(originalItems, submitted);

    expect(result.deletedIds).toEqual([]);
    expect(result.updatedItems).toEqual([]);
    expect(result.newItems).toEqual([
      { itemId: "i4", qty: "1", unitPrice: 7.00 },
    ]);
  });

  it("handles simultaneous remove, modify, and add", () => {
    const submitted = [
      { receiptItemId: "ri1", qty: "5", unitPrice: 5.50 },
      { receiptItemId: "", itemId: "i4", qty: "2", unitPrice: 7.00 },
    ];

    const result = computeItemDiff(originalItems, submitted);

    expect(result.deletedIds).toEqual(["ri2", "ri3"]);
    expect(result.updatedItems).toEqual([
      { receiptItemId: "ri1", qty: "5", unitPrice: 5.50 },
    ]);
    expect(result.newItems).toEqual([
      { itemId: "i4", qty: "2", unitPrice: 7.00 },
    ]);
  });

  it("handles all items removed", () => {
    const result = computeItemDiff(originalItems, []);

    expect(result.deletedIds).toEqual(["ri1", "ri2", "ri3"]);
    expect(result.updatedItems).toEqual([]);
    expect(result.newItems).toEqual([]);
  });
});

const mockDb = { execute: mock(() => Promise.resolve()) };

const createMockDeps = () => {
  const callLog: Array<{ fn: string; args: unknown[] }> = [];
  return {
    callLog,
    deps: {
      updateReceipt: mock((_db: unknown, ...args: unknown[]) => {
        callLog.push({ fn: "updateReceipt", args });
        return Promise.resolve();
      }),
      deleteReceiptItem: mock((_db: unknown, ...args: unknown[]) => {
        callLog.push({ fn: "deleteReceiptItem", args });
        return Promise.resolve();
      }),
      updateReceiptItem: mock((_db: unknown, ...args: unknown[]) => {
        callLog.push({ fn: "updateReceiptItem", args });
        return Promise.resolve();
      }),
      addReceiptItem: mock((_db: unknown, ...args: unknown[]) => {
        callLog.push({ fn: "addReceiptItem", args });
        return Promise.resolve();
      }),
    },
  };
};

describe("saveReceiptEdits", () => {
  it("calls updateReceipt with receipt-level fields", async () => {
    const { deps } = createMockDeps();
    await saveReceiptEdits(mockDb, {
      receiptId: "rcpt-1",
      merchantId: "m1",
      date: "2024.10.14",
      total: 14.25,
      itemCount: 2,
      originalItems: [],
      submittedItems: [],
    }, deps);

    expect(deps.updateReceipt).toHaveBeenCalledTimes(1);
    expect(deps.updateReceipt).toHaveBeenCalledWith(mockDb, "rcpt-1", {
      merchant_id: "m1",
      receipt_date: "2024.10.14",
      total: 14.25,
      item_count: 2,
    });
  });

  it("calls deleteReceiptItem for removed items", async () => {
    const { deps } = createMockDeps();
    await saveReceiptEdits(mockDb, {
      receiptId: "rcpt-1",
      merchantId: "m1",
      date: "2024.10.14",
      total: 5.50,
      itemCount: 1,
      originalItems: [
        { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
        { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
      ],
      submittedItems: [
        { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
      ],
    }, deps);

    expect(deps.deleteReceiptItem).toHaveBeenCalledTimes(1);
    expect(deps.deleteReceiptItem).toHaveBeenCalledWith(mockDb, "ri2");
  });

  it("calls updateReceiptItem for modified items", async () => {
    const { deps } = createMockDeps();
    await saveReceiptEdits(mockDb, {
      receiptId: "rcpt-1",
      merchantId: "m1",
      date: "2024.10.14",
      total: 19.75,
      itemCount: 2,
      originalItems: [
        { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
        { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
      ],
      submittedItems: [
        { receiptItemId: "ri1", qty: "3", unitPrice: 5.50 },
        { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
      ],
    }, deps);

    expect(deps.updateReceiptItem).toHaveBeenCalledTimes(1);
    expect(deps.updateReceiptItem).toHaveBeenCalledWith(mockDb, "ri1", {
      qty: "3",
      unitPrice: 5.50,
      receiptDate: "2024.10.14",
    });
  });

  it("calls addReceiptItem for new items", async () => {
    const { deps } = createMockDeps();
    await saveReceiptEdits(mockDb, {
      receiptId: "rcpt-1",
      merchantId: "m1",
      date: "2024.10.14",
      total: 21.25,
      itemCount: 3,
      originalItems: [
        { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
      ],
      submittedItems: [
        { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
        { receiptItemId: "", itemId: "i3", qty: "1", unitPrice: 7.00 },
      ],
    }, deps);

    expect(deps.addReceiptItem).toHaveBeenCalledTimes(1);
    expect(deps.addReceiptItem).toHaveBeenCalledWith(mockDb, {
      receiptId: "rcpt-1",
      itemId: "i3",
      qty: "1",
      unitPrice: 7.00,
      receiptDate: "2024.10.14",
    });
  });

  it("calls mutations in correct order: updateReceipt, delete, update, add", async () => {
    const { callLog, deps } = createMockDeps();
    await saveReceiptEdits(mockDb, {
      receiptId: "rcpt-1",
      merchantId: "m1",
      date: "2024.10.14",
      total: 12.50,
      itemCount: 2,
      originalItems: [
        { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
        { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
        { receiptItemId: "ri3", qty: "1", unitPrice: 1.00 },
      ],
      submittedItems: [
        { receiptItemId: "ri1", qty: "3", unitPrice: 5.50 },
        { receiptItemId: "", itemId: "i4", qty: "1", unitPrice: 7.00 },
      ],
    }, deps);

    expect(callLog.map(c => c.fn)).toEqual([
      "updateReceipt",
      "deleteReceiptItem",
      "deleteReceiptItem",
      "updateReceiptItem",
      "addReceiptItem",
    ]);
  });

  it("does not call delete/update/add when nothing changed", async () => {
    const { deps } = createMockDeps();
    await saveReceiptEdits(mockDb, {
      receiptId: "rcpt-1",
      merchantId: "m1",
      date: "2024.10.14",
      total: 14.25,
      itemCount: 2,
      originalItems: [
        { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
        { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
      ],
      submittedItems: [
        { receiptItemId: "ri1", qty: "2", unitPrice: 5.50 },
        { receiptItemId: "ri2", qty: "1", unitPrice: 3.25 },
      ],
    }, deps);

    expect(deps.deleteReceiptItem).not.toHaveBeenCalled();
    expect(deps.updateReceiptItem).not.toHaveBeenCalled();
    expect(deps.addReceiptItem).not.toHaveBeenCalled();
  });
});
