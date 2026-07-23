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
    mockExecute = mock(() => Promise.resolve({ rows: [] }));
  });

  it("createManifest() generates UUID and INSERTs with defaults", async () => {
    const { createManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    const result = await createManifest(mockDb, "user-123");

    expect(mockExecute).toHaveBeenCalledTimes(2); // manifest + manifest_crew
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("INSERT INTO manifests");
    expect(sql).toContain("title");
    expect(sql).toContain("status");
    expect(sql).toContain("items");
    expect(sql).toContain("user_id");

    // No old columns
    expect(sql).not.toContain("type");
    expect(sql).not.toContain("confidence");
    expect(sql).not.toContain("est_total");
    expect(sql).not.toContain("checked_count");

    expect(params[1]).toBeNull(); // title
    expect(params[2]).toBe("DRAFT"); // status
    expect(params[3]).toBe("[]"); // items JSON
    expect(params[4]).toBe("user-123"); // user_id

    expect(result).toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
  });

  it("updateManifest() updates only title when only title provided", async () => {
    const { updateManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await updateManifest(mockDb, "abc-123", { title: "New Title" });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("UPDATE manifests SET");
    expect(sql).toContain("title = ?");
    expect(sql).not.toContain("merchant_name = ?");
    expect(params[0]).toBe("New Title");
    expect(params).toContain("abc-123");
  });

  it("updateManifest() updates merchant_name when provided", async () => {
    const { updateManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await updateManifest(mockDb, "abc-123", { merchant_name: "TEST_MART" });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];

    expect(sql).toContain("merchant_name = ?");
    expect(sql).not.toContain("title = ?");
    expect(params[0]).toBe("TEST_MART");
    expect(params).toContain("abc-123");
  });

  it("updateManifest() always sets updated_at", async () => {
    const { updateManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await updateManifest(mockDb, "abc-123", { title: "Test" });

    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain("updated_at = ?");
    const updatedAtParam = params[params.length - 2];
    expect(updatedAtParam).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("updateManifest() does nothing when no fields provided", async () => {
    const { updateManifest } = await import("@/lib/manifest-mutations");
    const mockDb = { execute: mockExecute } as any;

    await updateManifest(mockDb, "abc-123", {});

    expect(mockExecute).not.toHaveBeenCalled();
  });

  describe("status transitions", () => {
    function makeStatusMock(currentStatus: string) {
      return mock((sql: string) => {
        if (sql.includes("SELECT status")) {
          return Promise.resolve({ rows: createMockRows([{ status: currentStatus }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("activateManifest updates status from DRAFT to ACTIVE", async () => {
      const { activateManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("DRAFT");
      const mockDb = { execute: dbExec } as any;

      await activateManifest(mockDb, "manifest-1");

      expect(dbExec).toHaveBeenCalledTimes(2);
      const [updateSql, updateParams] = dbExec.mock.calls[1];
      expect(updateSql).toContain("UPDATE manifests");
      expect(updateSql).toContain("status = ?");
      expect(updateParams).toContain("ACTIVE");
    });

    it("completeManifest updates status from ACTIVE to DONE", async () => {
      const { completeManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("ACTIVE");
      const mockDb = { execute: dbExec } as any;

      await completeManifest(mockDb, "manifest-1");

      const [updateSql, updateParams] = dbExec.mock.calls[1];
      expect(updateSql).toContain("UPDATE manifests");
      expect(updateParams).toContain("DONE");
    });

    it("archiveManifest updates status from DONE to ARCHIVED", async () => {
      const { archiveManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("DONE");
      const mockDb = { execute: dbExec } as any;

      await archiveManifest(mockDb, "manifest-1");

      const [updateSql, updateParams] = dbExec.mock.calls[1];
      expect(updateSql).toContain("UPDATE manifests");
      expect(updateParams).toContain("ARCHIVED");
    });

    it("throws on invalid transition", async () => {
      const { activateManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeStatusMock("ACTIVE");
      const mockDb = { execute: dbExec } as any;

      expect(activateManifest(mockDb, "manifest-1")).rejects.toThrow();
    });
  });

  describe("addManifestItem() (JSON blob)", () => {
    function makeItemsMock(itemsJson: string) {
      return mock((sql: string) => {
        if (sql.includes("SELECT items FROM manifests")) {
          return Promise.resolve({ rows: createMockRows([{ items: itemsJson }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("appends item to JSON blob", async () => {
      const { addManifestItem } = await import("@/lib/manifest-mutations");
      const dbExec = makeItemsMock('[]');
      const mockDb = { execute: dbExec } as any;

      await addManifestItem(mockDb, "manifest-1", {
        manifestItemId: "cat-1",
        name: "Bananas",
        category: "FRUIT",
        estimated_cost: "5.99",
      });

      // Should have SELECT items + UPDATE
      expect(dbExec).toHaveBeenCalledTimes(2);
      const [updateSql, updateParams] = dbExec.mock.calls[1];

      expect(updateSql).toContain("UPDATE manifests");
      expect(updateSql).toContain("items = ?");
      
      const updatedItems = JSON.parse(updateParams[0] as string);
      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].name).toBe("Bananas");
      expect(updatedItems[0].category).toBe("FRUIT");
      expect(updatedItems[0].manifest_item_id).toBe("cat-1");
      expect(updatedItems[0].checked).toBe(false);
    });
  });

  describe("toggleManifestItemChecked() (JSON blob)", () => {
    function makeItemsMock(itemsJson: string) {
      return mock((sql: string) => {
        if (sql.includes("SELECT items FROM manifests")) {
          return Promise.resolve({ rows: createMockRows([{ items: itemsJson }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("toggles checked state in JSON blob", async () => {
      const { toggleManifestItemChecked } = await import("@/lib/manifest-mutations");
      const itemsJson = JSON.stringify([
        { name: "Eggs", checked: false, estimated_cost: "4.50" },
        { name: "Milk", checked: false, estimated_cost: "3.00" },
      ]);
      const dbExec = makeItemsMock(itemsJson);
      const mockDb = { execute: dbExec } as any;

      await toggleManifestItemChecked(mockDb, "manifest-1", 0, true);

      const [updateSql, updateParams] = dbExec.mock.calls[1];
      const updatedItems = JSON.parse(updateParams[0] as string);
      expect(updatedItems[0].checked).toBe(true);
      expect(updatedItems[1].checked).toBe(false);
    });

    it("throws on invalid index", async () => {
      const { toggleManifestItemChecked } = await import("@/lib/manifest-mutations");
      const dbExec = makeItemsMock('[]');
      const mockDb = { execute: dbExec } as any;

      expect(toggleManifestItemChecked(mockDb, "manifest-1", 5, true)).rejects.toThrow();
    });
  });

  describe("removeManifestItem() (JSON blob)", () => {
    function makeItemsMock(itemsJson: string) {
      return mock((sql: string) => {
        if (sql.includes("SELECT items FROM manifests")) {
          return Promise.resolve({ rows: createMockRows([{ items: itemsJson }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("removes item from JSON blob by index", async () => {
      const { removeManifestItem } = await import("@/lib/manifest-mutations");
      const itemsJson = JSON.stringify([
        { name: "Eggs", checked: false, estimated_cost: "4.50" },
        { name: "Milk", checked: false, estimated_cost: "3.00" },
      ]);
      const dbExec = makeItemsMock(itemsJson);
      const mockDb = { execute: dbExec } as any;

      await removeManifestItem(mockDb, "manifest-1", 0);

      const [updateSql, updateParams] = dbExec.mock.calls[1];
      const updatedItems = JSON.parse(updateParams[0] as string);
      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].name).toBe("Milk");
    });
  });

  describe("deleteManifest()", () => {
    function makeDeleteMock(exists: boolean) {
      return mock((sql: string) => {
        if (sql.includes("SELECT") && sql.includes("manifests")) {
          return Promise.resolve({ rows: exists ? createMockRows([{ id: "manifest-123" }]) : createMockRows([]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("deletes manifest directly (no manifest_items cascade needed)", async () => {
      const { deleteManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeDeleteMock(true);
      const mockDb = { execute: dbExec } as any;

      await deleteManifest(mockDb, "manifest-123", "user-123");

      // SELECT + DELETE
      expect(dbExec).toHaveBeenCalledTimes(2);
      const deleteCall = dbExec.mock.calls[1];
      expect(deleteCall[0]).toContain("DELETE FROM manifests");
      expect(deleteCall[0]).not.toContain("manifest_items"); // no separate items table cleanup
    });

    it("throws when manifest not found", async () => {
      const { deleteManifest } = await import("@/lib/manifest-mutations");
      const dbExec = makeDeleteMock(false);
      const mockDb = { execute: dbExec } as any;

      expect(deleteManifest(mockDb, "nonexistent", null)).rejects.toThrow(/not found/i);
    });
  });

  describe("Catalog items (manifest_items table)", () => {
    it("createCatalogItem() INSERTs a new catalog item", async () => {
      const { createCatalogItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await createCatalogItem(mockDb, "user-1", { name: "Bananas", category: "FRUIT" });

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const [sql, params] = mockExecute.mock.calls[0];
      expect(sql).toContain("INSERT INTO manifest_items");
      expect(sql).toContain("name");
      expect(sql).toContain("category");
      expect(sql).toContain("user_id");
      expect(params).toContain("Bananas");
      expect(params).toContain("FRUIT");
      expect(params).toContain("user-1");
    });

    it("updateCatalogItem() updates name and category", async () => {
      const { updateCatalogItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await updateCatalogItem(mockDb, "cat-1", "user-1", { name: "Apples" });

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const [sql] = mockExecute.mock.calls[0];
      expect(sql).toContain("UPDATE manifest_items");
      expect(sql).toContain("name = ?");
      expect(sql).toContain("WHERE id = ? AND user_id = ?");
    });

    it("deleteCatalogItem() DELETEs from manifest_items", async () => {
      const { deleteCatalogItem } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await deleteCatalogItem(mockDb, "cat-1", "user-1");

      const [sql, params] = mockExecute.mock.calls[0];
      expect(sql).toContain("DELETE FROM manifest_items");
      expect(params).toContain("cat-1");
    });
  });

  describe("Merchant aisles", () => {
    it("createMerchantAisle() INSERTs with order", async () => {
      const { createMerchantAisle } = await import("@/lib/manifest-mutations");
      const mockExecuteAisle = mock((sql: string) => {
        if (sql.includes('MAX("order")')) {
          return Promise.resolve({ rows: createMockRows([{ max_order: 3 }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
      const mockDb = { execute: mockExecuteAisle } as any;

      await createMerchantAisle(mockDb, "m-1", "user-1", "DAIRY");

      // MAX(order) SELECT + INSERT
      expect(mockExecuteAisle).toHaveBeenCalledTimes(2);
      const [insertSql, insertParams] = mockExecuteAisle.mock.calls[1];
      expect(insertSql).toContain('INSERT INTO merchant_aisles');
      expect(insertSql).toContain('"order"');
      expect(insertParams).toContain("DAIRY");
      expect(insertParams).toContain(4); // max_order(3) + 1
    });

    it("deleteMerchantAisle() DELETEs from merchant_aisles", async () => {
      const { deleteMerchantAisle } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await deleteMerchantAisle(mockDb, "aisle-1", "m-1", "user-1");

      const [sql] = mockExecute.mock.calls[0];
      expect(sql).toContain("DELETE FROM merchant_aisles");
    });
  });

  describe("Cross-merchant category operations", () => {
    it("renameMerchantCategory() noop when old == new (no executes)", async () => {
      const { renameMerchantCategory } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await renameMerchantCategory(mockDb, "user-1", "DAIRY", "dairy");

      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("renameMerchantCategory() deletes conflicting targets then UPDATEs", async () => {
      const { renameMerchantCategory } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await renameMerchantCategory(mockDb, "user-1", "MILK", "DAIRY");

      expect(mockExecute).toHaveBeenCalledTimes(2);
      const [delSql, delParams] = mockExecute.mock.calls[0];
      const [updSql, updParams] = mockExecute.mock.calls[1];

      expect(delSql).toContain("DELETE FROM merchant_aisles");
      expect(delSql).toContain("user_id = ?");
      expect(delSql).toContain("merchant_id IN");
      expect(delParams).toContain("DAIRY");
      expect(delParams).toContain("MILK");

      expect(updSql).toContain("UPDATE merchant_aisles");
      expect(updSql).toContain("SET category = ?");
      expect(updSql).toContain("WHERE user_id = ? AND category = ?");
      expect(updParams[0]).toBe("DAIRY");
      expect(updParams).toContain("MILK");
      // Should NOT scope by merchant_id (global rename)
      expect(updSql).not.toContain("merchant_id = ?");
    });

    it("deleteMerchantCategory() DELETEs across all of user's merchants", async () => {
      const { deleteMerchantCategory } = await import("@/lib/manifest-mutations");
      const mockDb = { execute: mockExecute } as any;

      await deleteMerchantCategory(mockDb, "user-1", "DAIRY");

      const [sql, params] = mockExecute.mock.calls[0];
      expect(sql).toContain("DELETE FROM merchant_aisles");
      expect(sql).toContain("WHERE user_id = ? AND category = ?");
      expect(sql).not.toContain("merchant_id = ?"); // global, not per-merchant
      expect(params).toContain("user-1");
      expect(params).toContain("DAIRY");
    });
  });

  describe("Merchant item rules", () => {
    it("createMerchantItemRule() INSERTs a new rule", async () => {
      const { createMerchantItemRule } = await import("@/lib/manifest-mutations");
      const mockExecuteRule = mock((sql: string) => {
        if (sql.includes('MAX("order")')) {
          return Promise.resolve({ rows: createMockRows([{ max_order: 0 }]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
      const mockDb = { execute: mockExecuteRule } as any;

      await createMerchantItemRule(mockDb, "m-1", "cat-1", "user-1", "VEGETABLE");

      expect(mockExecuteRule).toHaveBeenCalledTimes(2);
      const [insertSql, insertParams] = mockExecuteRule.mock.calls[1];
      expect(insertSql).toContain("INSERT INTO merchant_item_rules");
      expect(insertParams).toContain("VEGETABLE");
    });
  });

  describe("Rule application", () => {
    function makeRuleMock(itemsJson: string, rules: any[]) {
      return mock((sql: string) => {
        if (sql.includes("SELECT items FROM manifests")) {
          return Promise.resolve({ rows: createMockRows([{ items: itemsJson }]) });
        }
        if (sql.includes("FROM merchant_item_rules")) {
          return Promise.resolve({ rows: createMockRows(rules) });
        }
        if (sql.includes("FROM manifest_items")) {
          return Promise.resolve({ rows: createMockRows([]) });
        }
        return Promise.resolve({ rows: createMockRows([]) });
      });
    }

    it("applyMerchantRules() applies rules to items with matching manifest_item_id", async () => {
      const { applyMerchantRules } = await import("@/lib/manifest-mutations");
      const itemsJson = JSON.stringify([
        { manifest_item_id: "cat-1", name: "Bananas", category: "FRUIT", checked: false, estimated_cost: "5.99" },
      ]);
      const rulesData = [
        { manifest_item_id: "cat-1", category: "VEGETABLE" },
      ];
      const dbExec = makeRuleMock(itemsJson, rulesData);
      const mockDb = { execute: dbExec } as any;

      await applyMerchantRules(mockDb, "manifest-1", "merchant-1");

      const updateCall = dbExec.mock.calls.find((c: any) => c[0].includes("UPDATE manifests"));
      expect(updateCall).toBeDefined();
      const updatedItems = JSON.parse(updateCall[1][0]);
      expect(updatedItems[0].category).toBe("VEGETABLE");
    });
  });
});
