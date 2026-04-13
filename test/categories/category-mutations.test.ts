import { describe, it, expect, mock, beforeEach } from "bun:test";

describe("Category mutations with user isolation", () => {
  let mockExecute: ReturnType<typeof mock>;

  beforeEach(() => {
    mockExecute = mock(() => Promise.resolve({ rows: [] }));
  });

  it("createCategory() includes user_id when logged in", async () => {
    const { createCategory } = await import("@/lib/category-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      name: "Test Category",
      emoji: "📦",
      description: "Test description",
      is_controlled: 0,
      created_at: null,
    };

    await createCategory(mockDb, data, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("INSERT INTO categories");
    expect(sql).toContain("user_id");
    expect(params).toContain("user-123");
  });

  it("createCategory() allows NULL user_id when logged out", async () => {
    const { createCategory } = await import("@/lib/category-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      name: "Test Category",
      emoji: "📦",
      description: null,
      is_controlled: 0,
      created_at: null,
    };

    await createCategory(mockDb, data, null);

    const [sql, params] = mockExecute.mock.calls[0];
    expect(params).toContain(null);
  });

  it("updateCategory() respects user_id ownership", async () => {
    const { updateCategory } = await import("@/lib/category-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "category-uuid";
    const data = { name: "Updated Name" };

    await updateCategory(mockDb, id, data, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("WHERE id = ?");
    expect(sql).toContain("AND user_id = ?");
  });

  it("deleteCategory() only deletes user's category", async () => {
    const { deleteCategory } = await import("@/lib/category-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "category-uuid";

    await deleteCategory(mockDb, id, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("DELETE FROM categories");
    expect(sql).toContain("AND user_id = ?");
  });
});