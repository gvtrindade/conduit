import { describe, it, expect, mock } from "bun:test";

describe("getPreference", () => {
  it("returns value when preference key exists", async () => {
    const mockExecute = mock(() =>
      Promise.resolve({
        rows: [{ preferences: JSON.stringify({ prefill_price: true }) }],
      })
    );
    const mockDb = { execute: mockExecute } as any;

    const { getPreference } = await import("@/lib/user-preferences");

    const result = await getPreference(mockDb, "prefill_price");

    expect(result).toBe(true);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toContain("SELECT preferences");
    expect(sql).toContain("users");
  });

  it("returns default when key is missing", async () => {
    const mockExecute = mock(() =>
      Promise.resolve({
        rows: [{ preferences: JSON.stringify({ other_key: "value" }) }],
      })
    );
    const mockDb = { execute: mockExecute } as any;

    const { getPreference } = await import("@/lib/user-preferences");

    const result = await getPreference(mockDb, "prefill_price", false);

    expect(result).toBe(false);
  });

  it("returns default when preferences is null", async () => {
    const mockExecute = mock(() =>
      Promise.resolve({ rows: [{ preferences: null }] })
    );
    const mockDb = { execute: mockExecute } as any;

    const { getPreference } = await import("@/lib/user-preferences");

    const result = await getPreference(mockDb, "prefill_price", true);

    expect(result).toBe(true);
  });

  it("returns undefined when no default and key missing", async () => {
    const mockExecute = mock(() =>
      Promise.resolve({
        rows: [{ preferences: JSON.stringify({ other: 1 }) }],
      })
    );
    const mockDb = { execute: mockExecute } as any;

    const { getPreference } = await import("@/lib/user-preferences");

    const result = await getPreference(mockDb, "nonexistent");

    expect(result).toBeUndefined();
  });
});

describe("setPreference", () => {
  it("writes key-value to preferences", async () => {
    const mockExecute = mock(() => Promise.resolve({ rows: [] }));
    const mockDb = { execute: mockExecute } as any;

    const { setPreference } = await import("@/lib/user-preferences");

    await setPreference(mockDb, "prefill_price", true);

    expect(mockExecute).toHaveBeenCalledTimes(2);
    const [sql, params] = mockExecute.mock.calls[1];
    expect(sql).toContain("UPDATE users");
    expect(sql).toContain("preferences");
    expect(params).toContain(JSON.stringify({ prefill_price: true }));
  });

  it("preserves existing preferences when adding new key", async () => {
    const mockExecute = mock((sql: string) => {
      if (sql.includes("SELECT")) {
        return Promise.resolve({
          rows: [{ preferences: JSON.stringify({ existing_key: "value" }) }],
        });
      }
      return Promise.resolve({ rows: [] });
    });
    const mockDb = { execute: mockExecute } as any;

    const { setPreference } = await import("@/lib/user-preferences");

    await setPreference(mockDb, "new_key", 42);

    const [updateSql, updateParams] = mockExecute.mock.calls[1];
    const updatedPrefs = JSON.parse(updateParams[0]);
    expect(updatedPrefs.existing_key).toBe("value");
    expect(updatedPrefs.new_key).toBe(42);
  });
});
