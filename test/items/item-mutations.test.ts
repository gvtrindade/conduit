import { describe, it, expect, mock, beforeEach } from "bun:test";

describe("Item mutations with user isolation", () => {
  let mockExecute: ReturnType<typeof mock>;

  beforeEach(() => {
    mockExecute = mock(() => Promise.resolve({ rows: [] }));
  });

  it("createItem() inserts with user_id when logged in", async () => {
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
      user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await createItem(mockDb, data, "user-123");

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("INSERT INTO items");
    expect(sql).toContain("user_id");
    expect(params).toContain("user-123");
    expect(params).toHaveLength(17);
    expect(result).toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
  });

  it("createItem() inserts with user_id = NULL when logged out", async () => {
    const { createItem } = await import("@/lib/item-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      name: "Anonymous Item",
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
      user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await createItem(mockDb, data, null);

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("INSERT INTO items");
    expect(params).toContain(null);
  });

  it("updateItem() respects user_id ownership", async () => {
    const { updateItem } = await import("@/lib/item-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "item-uuid-123";
    const data = { name: "Updated Name" };

    await updateItem(mockDb, id, data, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("UPDATE items");
    expect(sql).toContain("WHERE id = ?");
    expect(sql).toContain("AND user_id = ?");
    expect(params).toContain("user-123");
  });

  it("updateItem() allows update without user_id when logged out", async () => {
    const { updateItem } = await import("@/lib/item-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "item-uuid-123";
    const data = { name: "Updated Name" };

    await updateItem(mockDb, id, data, null);

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("UPDATE items");
    expect(sql).toContain("WHERE id = ?");
    expect(sql).not.toContain("AND user_id");
  });

  it("deleteItem() only deletes user's items", async () => {
    const { deleteItem } = await import("@/lib/item-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "item-uuid-to-delete";

    await deleteItem(mockDb, id, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("DELETE FROM items");
    expect(sql).toContain("WHERE id = ?");
    expect(sql).toContain("AND user_id = ?");
    expect(params).toContain("user-123");
  });
});