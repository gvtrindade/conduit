import { describe, it, expect, mock, beforeEach } from "bun:test";

describe("Tag mutations with user isolation", () => {
  let mockExecute: ReturnType<typeof mock>;

  beforeEach(() => {
    mockExecute = mock(() => Promise.resolve({ rows: [] }));
  });

  it("createTag() includes user_id when logged in", async () => {
    const { createTag } = await import("@/lib/tag-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      name: "ORG",
      is_controlled: 0,
      created_at: null,
    };

    await createTag(mockDb, data, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("INSERT INTO tags");
    expect(sql).toContain("user_id");
    expect(params).toContain("user-123");
  });

  it("createTag() allows NULL user_id when logged out", async () => {
    const { createTag } = await import("@/lib/tag-mutations");
    const mockDb = { execute: mockExecute } as any;

    const data = {
      name: "ORG",
      is_controlled: 0,
      created_at: null,
    };

    await createTag(mockDb, data, null);

    const [sql, params] = mockExecute.mock.calls[0];
    expect(params).toContain(null);
  });

  it("updateTag() respects user_id ownership", async () => {
    const { updateTag } = await import("@/lib/tag-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "tag-uuid";
    const data = { name: "NEW_TAG" };

    await updateTag(mockDb, id, data, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("WHERE id = ?");
    expect(sql).toContain("AND user_id = ?");
  });

  it("deleteTag() only deletes user's tag", async () => {
    const { deleteTag } = await import("@/lib/tag-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = "tag-uuid";

    await deleteTag(mockDb, id, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("DELETE FROM tags");
    expect(sql).toContain("AND user_id = ?");
  });
});