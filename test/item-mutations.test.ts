import { describe, it, expect, mock, beforeEach } from "bun:test";

describe("Item mutations", () => {
  let mockExecute: ReturnType<typeof mock>;

  beforeEach(() => {
    mockExecute = mock(() => Promise.resolve({ rows: [] }));
  });

  it("createItem() generates UUID and INSERTs into items table", async () => {
    const { createItem } = await import("@/lib/item-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      name: "Test Item",
      codename: "TEST_CODE",
      emoji: "🧪",
      category_id: "cat-uuid",
      category_custom: null,
      primary_tag_id: "tag-uuid",
      primary_tag_custom: null,
      unit: "kCr / unit",
      last_price: null,
      last_price_date: null,
      lowest_price: null,
      lowest_price_date: null,
      freq_source_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await createItem(mockDb, data);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("INSERT INTO items");
    expect(sql).toContain("id");
    expect(sql).toContain("name");
    expect(sql).toContain("codename");
    expect(sql).toContain("emoji");

    expect(params).toHaveLength(16);
    expect(result).toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
  });

  it("createItem() handles null optional fields", async () => {
    const { createItem } = await import("@/lib/item-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      name: "Minimal Item",
      codename: null,
      emoji: null,
      category_id: null,
      category_custom: null,
      primary_tag_id: null,
      primary_tag_custom: null,
      unit: null,
      last_price: null,
      last_price_date: null,
      lowest_price: null,
      lowest_price_date: null,
      freq_source_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await createItem(mockDb, data);

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("INSERT INTO items");
    expect(params).toHaveLength(16);
  });

  it("updateItem() generates UPDATE SQL with partial fields", async () => {
    const { updateItem } = await import("@/lib/item-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "item-uuid-123";
    const data = {
      name: "Updated Name",
      emoji: "📦",
    };

    await updateItem(mockDb, id, data);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("UPDATE items");
    expect(sql).toContain("WHERE id = ?");
    expect(sql).toContain("name = ?");
    expect(sql).toContain("emoji = ?");
    expect(sql).toContain("updated_at = ?");

    expect(params).toContain("Updated Name");
    expect(params).toContain("📦");
    expect(params).toContain(id);
  });

  it("updateItem() updates single field", async () => {
    const { updateItem } = await import("@/lib/item-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "item-uuid-456";
    const data = {
      unit: "kCr / kg",
    };

    await updateItem(mockDb, id, data);

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("UPDATE items");
    expect(sql).toContain("unit = ?");
    expect(params).toContain("kCr / kg");
    expect(params).toContain(id);
  });

  it("deleteItem() generates DELETE SQL", async () => {
    const { deleteItem } = await import("@/lib/item-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "item-uuid-to-delete";

    await deleteItem(mockDb, id);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("DELETE FROM items");
    expect(sql).toContain("WHERE id = ?");
    expect(params).toContain(id);
  });

  it("checkItemHasReceipts() returns true when item has receipts", async () => {
    const { checkItemHasReceipts } = await import("@/lib/item-mutations");
    const mockExecuteWithRows = mock(() =>
      Promise.resolve({ rows: [{ count: 3 }] })
    );
    const mockDb = { execute: mockExecuteWithRows } as any;

    const id = "item-with-receipts";

    const result = await checkItemHasReceipts(mockDb, id);

    expect(mockExecuteWithRows).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecuteWithRows.mock.calls[0];

    expect(sql).toContain("SELECT COUNT(*)");
    expect(sql).toContain("FROM receipt_items");
    expect(sql).toContain("WHERE item_id = ?");
    expect(params).toContain(id);

    expect(result).toBe(true);
  });

  it("checkItemHasReceipts() returns false when item has no receipts", async () => {
    const { checkItemHasReceipts } = await import("@/lib/item-mutations");
    const mockExecuteWithRows = mock(() =>
      Promise.resolve({ rows: [{ count: 0 }] })
    );
    const mockDb = { execute: mockExecuteWithRows } as any;

    const id = "item-no-receipts";

    const result = await checkItemHasReceipts(mockDb, id);

    expect(result).toBe(false);
  });
});
