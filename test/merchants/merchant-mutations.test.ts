import { describe, it, expect, mock, beforeEach } from "bun:test";

describe("Merchant mutations", () => {
  let mockExecute: ReturnType<typeof mock>;

  beforeEach(() => {
    mockExecute = mock(() => Promise.resolve({ rows: [] }));
  });

  it("createMerchant() generates UUID and INSERTs into merchants table", async () => {
    const { createMerchant } = await import("@/lib/merchant-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      name: "Test Merchant",
      emoji: "🏪",
      user_id: "user-123",
      created_at: new Date().toISOString(),
    };

    const result = await createMerchant(mockDb, data);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("INSERT INTO merchants");
    expect(sql).toContain("id");
    expect(sql).toContain("name");
    expect(sql).toContain("emoji");
    expect(sql).toContain("user_id");

    expect(params).toHaveLength(5);
    expect(params).toContain("user-123");
    expect(result).toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
  });

  it("updateMerchant() generates UPDATE SQL with partial fields", async () => {
    const { updateMerchant } = await import("@/lib/merchant-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "merchant-uuid-123";
    const data = {
      name: "Updated Name",
      emoji: "🏬",
    };

    await updateMerchant(mockDb, id, data, "user-123");

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("UPDATE merchants");
    expect(sql).toContain("WHERE id = ?");
    expect(sql).toContain("name = ?");
    expect(sql).toContain("emoji = ?");

    expect(params).toContain("Updated Name");
    expect(params).toContain("🏬");
    expect(params).toContain(id);
  });

  it("updateMerchant() updates single field", async () => {
    const { updateMerchant } = await import("@/lib/merchant-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "merchant-uuid-456";
    const data = {
      name: "Only Name Updated",
    };

    await updateMerchant(mockDb, id, data, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("UPDATE merchants");
    expect(sql).toContain("name = ?");
    expect(params).toContain("Only Name Updated");
    expect(params).toContain(id);
  });

  it("deleteMerchant() generates DELETE SQL", async () => {
    const { deleteMerchant } = await import("@/lib/merchant-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "merchant-uuid-to-delete";

    await deleteMerchant(mockDb, id, "user-123");

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("DELETE FROM merchants");
    expect(sql).toContain("WHERE id = ?");
    expect(params).toContain(id);
  });
});
