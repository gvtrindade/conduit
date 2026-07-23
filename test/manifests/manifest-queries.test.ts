import { describe, it, expect } from "bun:test";
import {
  MANIFESTS_LIST_QUERY,
  MANIFEST_DETAIL_QUERY,
  MANIFEST_CREW_QUERY,
  CATALOG_ITEMS_QUERY,
  MERCHANT_AISLES_QUERY,
  MERCHANT_ITEM_RULES_QUERY,
  MERCHANT_CATEGORIES_QUERY,
  MERCHANTS_LIST_QUERY,
  MERCHANT_RECEIPTS_QUERY,
  mapDbManifestToManifestListItem,
  mapDbManifestDetailToManifest,
  mapDbCrewToCrewMember,
  mapDbCatalogItem,
  mapDbMerchantAisle,
  mapDbMerchantItemRule,
  parseManifestItems,
} from "@/lib/manifest-queries";

describe("Manifest queries", () => {
  it("MANIFESTS_LIST_QUERY orders by status and date", () => {
    expect(MANIFESTS_LIST_QUERY).toContain("FROM manifests");
    expect(MANIFESTS_LIST_QUERY).toContain("ORDER BY");
    expect(MANIFESTS_LIST_QUERY).toContain("merchant_name");
    expect(MANIFESTS_LIST_QUERY).toContain("items");
  });

  it("MANIFEST_DETAIL_QUERY filters by id", () => {
    expect(MANIFEST_DETAIL_QUERY).toContain("WHERE manifests.id = ?");
    expect(MANIFEST_DETAIL_QUERY).toContain("merchant_name");
    expect(MANIFEST_DETAIL_QUERY).toContain("items");
  });

  it("MANIFEST_CREW_QUERY joins users and filters by manifest_id", () => {
    expect(MANIFEST_CREW_QUERY).toContain("JOIN users");
    expect(MANIFEST_CREW_QUERY).toContain("WHERE manifest_crew.manifest_id = ?");
  });

  it("CATALOG_ITEMS_QUERY filters by user_id from manifest_items", () => {
    expect(CATALOG_ITEMS_QUERY).toContain("FROM manifest_items");
    expect(CATALOG_ITEMS_QUERY).toContain("WHERE user_id = ?");
    expect(CATALOG_ITEMS_QUERY).toContain("ORDER BY name ASC");
  });

  it("MERCHANT_AISLES_QUERY filters by merchant_id and orders by order", () => {
    expect(MERCHANT_AISLES_QUERY).toContain("FROM merchant_aisles");
    expect(MERCHANT_AISLES_QUERY).toContain('"order"');
    expect(MERCHANT_AISLES_QUERY).toContain("WHERE merchant_id = ?");
  });

  it("MERCHANT_ITEM_RULES_QUERY filters by merchant_id and orders by order", () => {
    expect(MERCHANT_ITEM_RULES_QUERY).toContain("FROM merchant_item_rules");
    expect(MERCHANT_ITEM_RULES_QUERY).toContain('"order"');
    expect(MERCHANT_ITEM_RULES_QUERY).toContain("WHERE merchant_id = ?");
  });

  it("MERCHANT_CATEGORIES_QUERY returns distinct categories", () => {
    expect(MERCHANT_CATEGORIES_QUERY).toContain("SELECT DISTINCT category");
    expect(MERCHANT_CATEGORIES_QUERY).toContain("FROM merchant_aisles");
    expect(MERCHANT_CATEGORIES_QUERY).toContain("WHERE user_id = ?");
  });

  it("MERCHANTS_LIST_QUERY orders by name", () => {
    expect(MERCHANTS_LIST_QUERY).toContain("FROM merchants");
    expect(MERCHANTS_LIST_QUERY).toContain("WHERE user_id = ?");
    expect(MERCHANTS_LIST_QUERY).toContain("ORDER BY name ASC");
  });

  it("MERCHANT_RECEIPTS_QUERY filters by merchant_id and user_id", () => {
    expect(MERCHANT_RECEIPTS_QUERY).toContain("FROM receipts");
    expect(MERCHANT_RECEIPTS_QUERY).toContain("WHERE receipts.merchant_id = ?");
    expect(MERCHANT_RECEIPTS_QUERY).toContain("ORDER BY receipts.receipt_date DESC");
  });

  it("parseManifestItems parses JSON string", () => {
    const items = parseManifestItems('[{"name":"Eggs","checked":false,"estimated_cost":"4.50"}]');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Eggs");
    expect(items[0].estimated_cost).toBe("4.50");
  });

  it("parseManifestItems returns empty array for null", () => {
    expect(parseManifestItems(null)).toEqual([]);
  });

  it("parseManifestItems returns empty array for malformed JSON", () => {
    expect(parseManifestItems("not-json")).toEqual([]);
  });

  it("mapDbManifestToManifestListItem maps a DB row with items JSON", () => {
    const row = {
      id: "mft-042",
      title: "WEEK_42_REUP",
      status: "ACTIVE",
      merchant_name: "TEST_MART",
      items: '[{"name":"Eggs","checked":false,"estimated_cost":"4.50","category":"DAIRY"}]',
      created_by: "user-1",
      created_at: "2024-10-14T14:31:00Z",
      updated_at: "2024-10-14T14:31:00Z",
      crew_count: 3,
      created_by_callsign: "CAPTAIN",
    };

    const mft = mapDbManifestToManifestListItem(row);

    expect(mft.id).toBe("mft-042");
    expect(mft.title).toBe("WEEK_42_REUP");
    expect(mft.status).toBe("active");
    expect(mft.merchantName).toBe("TEST_MART");
    expect(mft.items).toHaveLength(1);
    expect(mft.items[0].name).toBe("Eggs");
    expect(mft.createdByCallsign).toBe("CAPTAIN");
  });

  it("mapDbManifestToManifestListItem maps status to lowercase", () => {
    const statuses = [
      { db: "ACTIVE", ui: "active" },
      { db: "DRAFT", ui: "draft" },
      { db: "DONE", ui: "done" },
      { db: "ARCHIVED", ui: "archived" },
    ];

    for (const { db, ui } of statuses) {
      const row = {
        id: "1", title: "TEST", status: db, merchant_name: null,
        items: "[]", created_by: null, created_at: null, updated_at: null,
        crew_count: 0, created_by_callsign: null,
      };
      expect(mapDbManifestToManifestListItem(row).status).toBe(ui);
    }
  });

  it("mapDbManifestToManifestListItem handles null values", () => {
    const row = {
      id: "1", title: "TEST", status: "DRAFT", merchant_name: null,
      items: "[]", created_by: null, created_at: null, updated_at: null,
      crew_count: 0, created_by_callsign: null,
    };

    const mft = mapDbManifestToManifestListItem(row);
    expect(mft.title).toBe("TEST");
    expect(mft.items).toEqual([]);
    expect(mft.crew).toEqual([]);
  });

  it("mapDbManifestToManifestListItem handles null title", () => {
    const row = {
      id: "1", title: null, status: "DRAFT", merchant_name: null,
      items: "[]", created_by: null, created_at: null, updated_at: null,
      crew_count: 0, created_by_callsign: null,
    };

    const mft = mapDbManifestToManifestListItem(row);
    expect(mft.title).toBe("");
  });

  it("mapDbManifestDetailToManifest maps a DB row with items and crew", () => {
    const row = {
      id: "mft-042", title: "WEEK_42_REUP", status: "ACTIVE",
      merchant_name: "TEST_MART",
      items: '[{"name":"Eggs","checked":true,"estimated_cost":"4.50","category":"DAIRY"}]',
      created_by: null,
      created_at: "2024-10-14T14:31:00Z", updated_at: "2024-10-14T14:31:00Z",
    };
    const crew = [{ initials: "CP", callsign: "CAPT_PROVISIONS", role: "SECTOR_7 // HQ", color: "#4A3828", badge: "COMMANDER" }];

    const mft = mapDbManifestDetailToManifest(row, crew);

    expect(mft.id).toBe("mft-042");
    expect(mft.items).toHaveLength(1);
    expect(mft.crew).toHaveLength(1);
    expect(mft.items[0].name).toBe("Eggs");
    expect(mft.items[0].checked).toBe(true);
    expect(mft.crew[0].initials).toBe("CP");
  });

  it("mapDbManifestDetailToManifest handles null title", () => {
    const row = {
      id: "mft-043", title: null, status: "DRAFT",
      merchant_name: null, items: "[]", created_by: null,
      created_at: null, updated_at: null,
    };

    const mft = mapDbManifestDetailToManifest(row);
    expect(mft.title).toBe("");
  });

  it("mapDbCatalogItem maps a catalog row", () => {
    const row = {
      id: "cat-1", name: "Bananas", category: "FRUIT",
      user_id: "user-1", created_at: "now", updated_at: "now",
    };
    const item = mapDbCatalogItem(row);
    expect(item.name).toBe("Bananas");
    expect(item.category).toBe("FRUIT");
  });

  it("mapDbMerchantAisle maps an aisle row", () => {
    const row = {
      id: "aisle-1", merchant_id: "m-1", category: "FRUIT",
      order: 1, user_id: "user-1", created_at: "now",
    };
    const aisle = mapDbMerchantAisle(row);
    expect(aisle.category).toBe("FRUIT");
    expect(aisle.order).toBe(1);
  });

  it("mapDbMerchantItemRule maps a rule row", () => {
    const row = {
      id: "rule-1", merchant_id: "m-1", manifest_item_id: "cat-1",
      category: "VEGETABLE", order: 1, user_id: "user-1", created_at: "now",
    };
    const rule = mapDbMerchantItemRule(row);
    expect(rule.manifest_item_id).toBe("cat-1");
    expect(rule.category).toBe("VEGETABLE");
  });

  it("mapDbCrewToCrewMember derives initials from callsign", () => {
    const row = {
      manifest_id: "mft-042",
      user_id: "uuid-1",
      role: "SECTOR_7 // HQ",
      callsign: "CAPT_PROVISIONS",
      color: "#4A3828",
    };

    const member = mapDbCrewToCrewMember(row);

    expect(member.initials).toBe("CP");
    expect(member.callsign).toBe("CAPT_PROVISIONS");
    expect(member.role).toBe("SECTOR_7 // HQ");
    expect(member.color).toBe("#4A3828");
    expect(member.badge).toBe("OPERATOR");
  });

  it("mapDbCrewToCrewMember handles null color", () => {
    const row = {
      manifest_id: "1", user_id: "1", role: null,
      callsign: "J.DAVIDSON", color: null,
    };

    const member = mapDbCrewToCrewMember(row);
    expect(member.role).toBe("");
    expect(member.color).toBe("#2A3848");
  });
});
