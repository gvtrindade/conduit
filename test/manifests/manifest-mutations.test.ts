import { describe, it, expect, mock, beforeEach } from "bun:test";

function createMockRows(data: any) {
  return {
    length: data.length,
    item: (idx: number) => data[idx],
  };
}

describe("Manifest mutations", () => {
  let mockExecute: ReturnType<typeof mock>;

  beforeEach(() => {
    mockExecute = mock((sql: string) => {
      if (sql.includes("COUNT(*)") && sql.includes("SUM")) {
        return Promise.resolve({ rows: createMockRows([{ total: 0, checked: 0 }]) });
      }
      return Promise.resolve({ rows: createMockRows([]) });
    });
  });

  it("createManifest() generates UUID and INSERTs with defaults", async () => {
    const { createManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    const result = await createManifest(mockDb, "user-123");

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("INSERT INTO manifests");
    expect(sql).toContain("title");
    expect(sql).toContain("type");
    expect(sql).toContain("status");
    expect(sql).toContain("user_id");

    expect(params).toHaveLength(11);
    expect(params[1]).toBeNull();
    expect(params[2]).toBe("WEEKLY");
    expect(params[3]).toBe("DRAFT");
    expect(params[7]).toBe("user-123");

    expect(result).toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
  });

  it("createManifest() includes user_id when logged in", async () => {
    const { createManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await createManifest(mockDb, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(params).toContain("user-123");
  });

  it("createManifest() allows NULL user_id when logged out", async () => {
    const { createManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await createManifest(mockDb, null);

    const [sql, params] = mockExecute.mock.calls[0];
    expect(params).toContain(null);
  });

  it("createManifest() returns the generated id", async () => {
    const { createManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    const id = await createManifest(mockDb, "user-123");

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("createManifest() sets est_total to 0", async () => {
    const { createManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await createManifest(mockDb);

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("est_total");
    expect(params[4]).toBe(0);
  });

  it("createManifest() sets checked_count to 0", async () => {
    const { createManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await createManifest(mockDb);

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("checked_count");
    expect(params[6]).toBe(0);
  });

  it("createManifest() includes created_at and updated_at timestamps", async () => {
    const { createManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await createManifest(mockDb, "user-123");

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("created_at");
    expect(sql).toContain("updated_at");

    const createdAt = params[9];
    const updatedAt = params[10];
    expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("updateManifest() updates only title when only title provided", async () => {
    const { updateManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await updateManifest(mockDb, "abc-123", { title: "New Title" }, "user-123");

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("UPDATE manifests SET");
    expect(sql).toContain("title = ?");
    expect(sql).not.toContain("type = ?");
    expect(params[0]).toBe("New Title");
    expect(params).toContain("abc-123");
  });

  it("updateManifest() updates only type when only type provided", async () => {
    const { updateManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await updateManifest(mockDb, "abc-123", { type: "BULK" });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("type = ?");
    expect(sql).not.toContain("title = ?");
    expect(params[0]).toBe("BULK");
    expect(params).toContain("abc-123");
  });

  it("updateManifest() updates both title and type when both provided", async () => {
    const { updateManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await updateManifest(mockDb, "abc-123", { title: "Updated", type: "MONTHLY" });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("title = ?");
    expect(sql).toContain("type = ?");
    expect(params).toContain("Updated");
    expect(params).toContain("MONTHLY");
    expect(params).toContain("abc-123");
  });

  it("updateManifest() always sets updated_at", async () => {
    const { updateManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await updateManifest(mockDb, "abc-123", { title: "Test" });

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("updated_at = ?");
    // updated_at is second-to-last param, id is last
    const updatedAtParam = params[params.length - 2];
    expect(updatedAtParam).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("updateManifest() does nothing when no fields provided", async () => {
    const { updateManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await updateManifest(mockDb, "abc-123", {});

    expect(mockExecute).not.toHaveBeenCalled();
  });

  describe("activateManifest()", () => {
    function makeStatusMock(currentStatus: string) {
      return mock((sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT status")) {
          return Promise.resolve({ rows: createMockRows([{ status: currentStatus }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("updates status from DRAFT to ACTIVE", async () => {
      const { activateManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("DRAFT");
      const mockDb = { execute: dbExec } as any;

      await activateManifest(mockDb, "manifest-1");

      expect(dbExec).toHaveBeenCalledTimes(2);
      const [updateSql, updateParams] = dbExec.mock.calls[1];
      expect(updateSql).toContain("UPDATE manifests");
      expect(updateSql).toContain("status = ?");
      expect(updateParams).toContain("ACTIVE");
      expect(updateParams).toContain("manifest-1");
    });

    it("throws when manifest is already ACTIVE", async () => {
      const { activateManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("ACTIVE");
      const mockDb = { execute: dbExec } as any;

      expect(activateManifest(mockDb, "manifest-1")).rejects.toThrow(
        /cannot activate/i
      );
    });

    it("throws when manifest is DONE", async () => {
      const { activateManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("DONE");
      const mockDb = { execute: dbExec } as any;

      expect(activateManifest(mockDb, "manifest-1")).rejects.toThrow(
        /cannot activate/i
      );
    });

    it("throws when manifest is ARCHIVED", async () => {
      const { activateManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("ARCHIVED");
      const mockDb = { execute: dbExec } as any;

      expect(activateManifest(mockDb, "manifest-1")).rejects.toThrow(
        /cannot activate/i
      );
    });

    it("throws when manifest is not found", async () => {
      const { activateManifest } = await import("@/lib/manifest-mutations");
      const dbExec = mock(() => Promise.resolve({ rows: [] }));
      const mockDb = { execute: dbExec } as any;

      expect(activateManifest(mockDb, "nonexistent")).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe("completeManifest()", () => {
    function makeStatusMock(currentStatus: string) {
      return mock((sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT status")) {
          return Promise.resolve({ rows: createMockRows([{ status: currentStatus }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("updates status from ACTIVE to DONE", async () => {
      const { completeManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("ACTIVE");
      const mockDb = { execute: dbExec } as any;

      await completeManifest(mockDb, "manifest-1");

      expect(dbExec).toHaveBeenCalledTimes(2);
      const [updateSql, updateParams] = dbExec.mock.calls[1];
      expect(updateSql).toContain("UPDATE manifests");
      expect(updateSql).toContain("status = ?");
      expect(updateParams).toContain("DONE");
      expect(updateParams).toContain("manifest-1");
    });

    it("throws when manifest is DRAFT", async () => {
      const { completeManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("DRAFT");
      const mockDb = { execute: dbExec } as any;

      expect(completeManifest(mockDb, "manifest-1")).rejects.toThrow(
        /cannot complete/i
      );
    });

    it("throws when manifest is DONE", async () => {
      const { completeManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("DONE");
      const mockDb = { execute: dbExec } as any;

      expect(completeManifest(mockDb, "manifest-1")).rejects.toThrow(
        /cannot complete/i
      );
    });

    it("throws when manifest is ARCHIVED", async () => {
      const { completeManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("ARCHIVED");
      const mockDb = { execute: dbExec } as any;

      expect(completeManifest(mockDb, "manifest-1")).rejects.toThrow(
        /cannot complete/i
      );
    });
  });

  describe("archiveManifest()", () => {
    function makeStatusMock(currentStatus: string) {
      return mock((sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT status")) {
          return Promise.resolve({ rows: createMockRows([{ status: currentStatus }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("updates status from DONE to ARCHIVED", async () => {
      const { archiveManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("DONE");
      const mockDb = { execute: dbExec } as any;

      await archiveManifest(mockDb, "manifest-1");

      expect(dbExec).toHaveBeenCalledTimes(2);
      const [updateSql, updateParams] = dbExec.mock.calls[1];
      expect(updateSql).toContain("UPDATE manifests");
      expect(updateSql).toContain("status = ?");
      expect(updateParams).toContain("ARCHIVED");
      expect(updateParams).toContain("manifest-1");
    });

    it("throws when manifest is DRAFT", async () => {
      const { archiveManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("DRAFT");
      const mockDb = { execute: dbExec } as any;

      expect(archiveManifest(mockDb, "manifest-1")).rejects.toThrow(
        /cannot archive/i
      );
    });

    it("throws when manifest is ACTIVE", async () => {
      const { archiveManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("ACTIVE");
      const mockDb = { execute: dbExec } as any;

      expect(archiveManifest(mockDb, "manifest-1")).rejects.toThrow(
        /cannot archive/i
      );
    });

    it("throws when manifest is ARCHIVED", async () => {
      const { archiveManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("ARCHIVED");
      const mockDb = { execute: dbExec } as any;

      expect(archiveManifest(mockDb, "manifest-1")).rejects.toThrow(
        /cannot archive/i
      );
    });
  });

  describe("addManifestItem()", () => {
    it("inserts a catalog item with item_id and prev_price", async () => {
      const { addManifestItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await addManifestItem(mockDb, "manifest-1", {
        itemId: "item-abc",
        itemName: "Bananas",
        prevPrice: 5.99,
        isUnknown: false,
      });

      const [sql, params] = mockExecute.mock.calls[0];

      expect(sql).toContain("INSERT INTO manifest_items");
      expect(params).toContain("manifest-1");
      expect(params).toContain("item-abc");
      expect(params).toContain("Bananas");
      expect(params).toContain(5.99);
    });

    it("inserts a custom unknown item without item_id or prev_price", async () => {
      const { addManifestItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await addManifestItem(mockDb, "manifest-1", {
        itemName: "Some weird fruit",
        isUnknown: true,
      });

      const [sql, params] = mockExecute.mock.calls[0];

      expect(sql).toContain("INSERT INTO manifest_items");
      expect(params).toContain("manifest-1");
      expect(params).toContain("Some weird fruit");
      expect(params).toContain(1);

      // item_id should be null, prev_price should be null
      const itemIdIndex = sql.split(",").findIndex((s: string) => s.includes("item_id"));
      expect(params[itemIdIndex]).toBeNull();
      const prevPriceIndex = sql.split(",").findIndex((s: string) => s.includes("prev_price"));
      expect(params[prevPriceIndex]).toBeNull();
    });

    it("inserts a catalog item with null prev_price when no price history", async () => {
      const { addManifestItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await addManifestItem(mockDb, "manifest-1", {
        itemId: "item-new",
        itemName: "New Item",
        isUnknown: false,
      });

      const [sql, params] = mockExecute.mock.calls[0];

      expect(sql).toContain("INSERT INTO manifest_items");
      expect(params).toContain("item-new");
      expect(params).toContain("New Item");

      // prev_price should be null
      const prevPriceIndex = sql.split(",").findIndex((s: string) => s.includes("prev_price"));
      expect(params[prevPriceIndex]).toBeNull();
    });

    it("returns a generated UUID", async () => {
      const { addManifestItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      const id = await addManifestItem(mockDb, "manifest-1", {
        itemName: "Test",
      });

      expect(typeof id).toBe("string");
      expect(id).toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
      );
    });

    it("sets checked to false by default", async () => {
      const { addManifestItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await addManifestItem(mockDb, "manifest-1", {
        itemName: "Test",
      });

      const [sql, params] = mockExecute.mock.calls[0];
      expect(sql).toContain("checked");

      // checked is the 5th column in the VALUES clause
      const checkedIndex = sql.split(",").findIndex((s: string) => s.includes("checked"));
      expect(params[checkedIndex]).toBe(0);
    });

    it("recalculates est_total after inserting an item", async () => {
      const { addManifestItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await addManifestItem(mockDb, "manifest-1", {
        itemId: "item-abc",
        itemName: "Bananas",
        prevPrice: 5.99,
      });

      expect(mockExecute).toHaveBeenCalledTimes(4);
      const [recalcSql, recalcParams] = mockExecute.mock.calls[1];

      expect(recalcSql).toContain("UPDATE manifests");
      expect(recalcSql).toContain("est_total");
      expect(recalcSql).toContain("SUM");
      expect(recalcParams).toContain("manifest-1");
    });
  });

  describe("removeManifestItem()", () => {
    it("deletes from manifest_items by id", async () => {
      const { removeManifestItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await removeManifestItem(mockDb, "manifest-1", "item-123");

      const [sql, params] = mockExecute.mock.calls[0];

      expect(sql).toContain("DELETE FROM manifest_items");
      expect(sql).toContain("WHERE id = ?");
      expect(params).toContain("item-123");
    });

    it("uses the item id as the parameter", async () => {
      const { removeManifestItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await removeManifestItem(mockDb, "manifest-1", "abc-def-456");

      const [sql, params] = mockExecute.mock.calls[0];
      expect(params).toContain("abc-def-456");
    });

    it("recalculates est_total after deleting an item", async () => {
      const { removeManifestItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await removeManifestItem(mockDb, "manifest-1", "item-123");

      expect(mockExecute).toHaveBeenCalledTimes(4);
      const [recalcSql, recalcParams] = mockExecute.mock.calls[1];

      expect(recalcSql).toContain("UPDATE manifests");
      expect(recalcSql).toContain("est_total");
      expect(recalcSql).toContain("SUM");
      expect(recalcParams).toContain("manifest-1");
    });
  });

  describe("recalculateEstTotal()", () => {
    it("updates est_total with SUM(COALESCE(prev_price, 0)) for the manifest", async () => {
      const { recalculateEstTotal } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await recalculateEstTotal(mockDb, "manifest-abc");

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const [sql, params] = mockExecute.mock.calls[0];

      expect(sql).toContain("UPDATE manifests");
      expect(sql).toContain("est_total");
      expect(sql).toContain("SUM");
      expect(sql).toContain("COALESCE");
      expect(sql).toContain("prev_price");
      expect(sql).toContain("manifest_items");
      expect(sql).toContain("WHERE id = ?");
      expect(params).toContain("manifest-abc");
    });
  });

  describe("toggleManifestItemChecked()", () => {
    function makeToggleMock(manifestId: string) {
      return mock((sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT manifest_id")) {
          return Promise.resolve({ rows: createMockRows([{ manifest_id: manifestId }]) });
        }
        if (sql.includes("COUNT(*)") && sql.includes("SUM")) {
          return Promise.resolve({ rows: createMockRows([{ total: 1, checked: 1 }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("updates checked to true", async () => {
      const { toggleManifestItemChecked } = await import("@/lib/manifest-mutations");
      const dbExec = makeToggleMock("manifest-1");
      const mockDb = { execute: dbExec } as any;

      await toggleManifestItemChecked(mockDb, "item-123", true);

      const updateCall = dbExec.mock.calls.find((c: any) => c[0].includes("UPDATE manifest_items"));
      expect(updateCall).toBeDefined();
      const [sql, params] = updateCall!;

      expect(sql).toContain("UPDATE manifest_items");
      expect(sql).toContain("checked = ?");
      expect(sql).toContain("WHERE id = ?");
      expect(params).toContain(1);
      expect(params).toContain("item-123");
    });

    it("updates checked to false", async () => {
      const { toggleManifestItemChecked } = await import("@/lib/manifest-mutations");
      const dbExec = makeToggleMock("manifest-1");
      const mockDb = { execute: dbExec } as any;

      await toggleManifestItemChecked(mockDb, "item-456", false);

      const updateCall = dbExec.mock.calls.find((c: any) => c[0].includes("UPDATE manifest_items"));
      expect(updateCall).toBeDefined();
      const [sql, params] = updateCall!;
      expect(sql).toContain("checked = ?");
      expect(params).toContain(0);
      expect(params).toContain("item-456");
    });

    it("passes checked as integer (0 or 1)", async () => {
      const { toggleManifestItemChecked } = await import("@/lib/manifest-mutations");
      const dbExec = makeToggleMock("manifest-1");
      const mockDb = { execute: dbExec } as any;

      await toggleManifestItemChecked(mockDb, "item-789", true);

      const updateCall = dbExec.mock.calls.find((c: any) => c[0].includes("UPDATE manifest_items"));
      const [, params] = updateCall!;
      expect(params[0]).toBe(1);
    });

    it("recalculates comp_lvl after toggling", async () => {
      const { toggleManifestItemChecked } = await import("@/lib/manifest-mutations");
      const dbExec = makeToggleMock("manifest-1");
      const mockDb = { execute: dbExec } as any;

      await toggleManifestItemChecked(mockDb, "item-123", true);

      const recalcCall = dbExec.mock.calls.find((c: any) => c[0].includes("UPDATE manifests") && c[0].includes("checked_count"));
      expect(recalcCall).toBeDefined();
      const [recalcSql, recalcParams] = recalcCall!;

      expect(recalcSql).toContain("UPDATE manifests");
      expect(recalcSql).toContain("checked_count");
      expect(recalcSql).toContain("confidence");
    });
  });

  describe("deleteManifest()", () => {
    function makeDeleteMock(exists: boolean) {
      return mock((sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT") && sql.includes("manifests")) {
          return Promise.resolve({ rows: exists ? createMockRows([{ status: "DRAFT" }]) : createMockRows([]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("deletes manifest_items first, then manifest", async () => {
      const { deleteManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeDeleteMock(true);
      const mockDb = { execute: dbExec } as any;

      await deleteManifest(mockDb, "manifest-123");

      expect(dbExec).toHaveBeenCalledTimes(3);
      const [firstSql, firstParams] = dbExec.mock.calls[1];
      expect(firstSql).toContain("DELETE FROM manifest_items");
      expect(firstSql).toContain("WHERE manifest_id = ?");
      expect(firstParams).toContain("manifest-123");

      const [secondSql, secondParams] = dbExec.mock.calls[2];
      expect(secondSql).toContain("DELETE FROM manifests");
      expect(secondSql).toContain("WHERE id = ?");
      expect(secondParams).toContain("manifest-123");
    });

    it("deletes items before manifest (correct order)", async () => {
      const { deleteManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeDeleteMock(true);
      const mockDb = { execute: dbExec } as any;

      await deleteManifest(mockDb, "manifest-abc");

      const callOrder = dbExec.mock.calls.map((c: any) => c[0]);
      const itemsDeleteIndex = callOrder.findIndex((s: string) => s.includes("manifest_items"));
      const manifestDeleteIndex = callOrder.findIndex((s: string) => s.includes("DELETE FROM manifests"));

      expect(itemsDeleteIndex).toBeLessThan(manifestDeleteIndex);
    });

    it("throws when manifest not found", async () => {
      const { deleteManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeDeleteMock(false);
      const mockDb = { execute: dbExec } as any;

      expect(deleteManifest(mockDb, "nonexistent")).rejects.toThrow(/not found/i);
    });
  });

  describe("recalculateCompLvl()", () => {
    function makeCompLvlMock(rows: { total: number; checked: number }[]) {
      return mock((sql: string, params?: unknown[]) => {
        if (sql.includes("COUNT(*)") && sql.includes("SUM")) {
          return Promise.resolve({
            rows: {
              length: 1,
              item: () => rows[0] || { total: 0, checked: 0 },
            },
          });
        }
        return Promise.resolve({ rows: [] });
      });
    }

    it("sets 0% when no items in manifest", async () => {
      const { recalculateCompLvl } = await import("@/lib/manifest-mutations");
      const dbExec = makeCompLvlMock([{ total: 0, checked: 0 }]);
      const mockDb = { execute: dbExec } as any;

      await recalculateCompLvl(mockDb, "manifest-empty");

      const [, params] = dbExec.mock.calls[1];
      expect(params[0]).toBe(0);
      expect(params[1]).toBe("0%");
    });

    it("sets 0% when none of the items are checked", async () => {
      const { recalculateCompLvl } = await import("@/lib/manifest-mutations");
      const dbExec = makeCompLvlMock([{ total: 4, checked: 0 }]);
      const mockDb = { execute: dbExec } as any;

      await recalculateCompLvl(mockDb, "manifest-1");

      const [, params] = dbExec.mock.calls[1];
      expect(params[0]).toBe(0);
      expect(params[1]).toBe("0%");
    });

    it("sets 50% when half of the items are checked", async () => {
      const { recalculateCompLvl } = await import("@/lib/manifest-mutations");
      const dbExec = makeCompLvlMock([{ total: 4, checked: 2 }]);
      const mockDb = { execute: dbExec } as any;

      await recalculateCompLvl(mockDb, "manifest-2");

      const [, params] = dbExec.mock.calls[1];
      expect(params[0]).toBe(2);
      expect(params[1]).toBe("50%");
    });

    it("sets 100% when all items are checked", async () => {
      const { recalculateCompLvl } = await import("@/lib/manifest-mutations");
      const dbExec = makeCompLvlMock([{ total: 3, checked: 3 }]);
      const mockDb = { execute: dbExec } as any;

      await recalculateCompLvl(mockDb, "manifest-3");

      const [, params] = dbExec.mock.calls[1];
      expect(params[0]).toBe(3);
      expect(params[1]).toBe("100%");
    });

    it("handles odd percentages correctly (e.g., 33%)", async () => {
      const { recalculateCompLvl } = await import("@/lib/manifest-mutations");
      const dbExec = makeCompLvlMock([{ total: 3, checked: 1 }]);
      const mockDb = { execute: dbExec } as any;

      await recalculateCompLvl(mockDb, "manifest-4");

      const [, params] = dbExec.mock.calls[1];
      expect(params[0]).toBe(1);
      expect(params[1]).toBe("33%");
    });
  });
});
