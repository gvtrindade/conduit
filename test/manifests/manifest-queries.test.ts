import { describe, it, expect } from "bun:test";
import {
  MANIFESTS_LIST_QUERY,
  MANIFEST_DETAIL_QUERY,
  MANIFEST_ITEMS_QUERY,
  MANIFEST_CREW_QUERY,
  mapDbManifestToManifestListItem,
  mapDbManifestDetailToManifest,
  mapDbManifestItemToManifestItem,
  mapDbCrewToCrewMember,
} from "@/lib/manifest-queries";

describe("Manifest queries", () => {
  it("MANIFESTS_LIST_QUERY orders by status and date", () => {
    expect(MANIFESTS_LIST_QUERY).toContain("FROM manifests");
    expect(MANIFESTS_LIST_QUERY).toContain("ORDER BY");
  });

  it("MANIFEST_DETAIL_QUERY filters by id", () => {
    expect(MANIFEST_DETAIL_QUERY).toContain("WHERE manifests.id = ?");
  });

  it("MANIFEST_ITEMS_QUERY filters by manifest_id", () => {
    expect(MANIFEST_ITEMS_QUERY).toContain("WHERE manifest_id = ?");
  });

  it("MANIFEST_CREW_QUERY joins users and filters by manifest_id", () => {
    expect(MANIFEST_CREW_QUERY).toContain("JOIN users");
    expect(MANIFEST_CREW_QUERY).toContain("WHERE manifest_crew.manifest_id = ?");
  });

  it("mapDbManifestToManifestListItem maps a DB row", () => {
    const row = {
      id: "mft-042",
      title: "WEEK_42_REUP",
      type: "WEEKLY",
      status: "ACTIVE",
      est_total: 312,
      confidence: "±7%",
      checked_count: 3,
      created_at: "2024-10-14T14:31:00Z",
      updated_at: "2024-10-14T14:31:00Z",
      item_count: 7,
      crew_count: 3,
    };

    const mft = mapDbManifestToManifestListItem(row);

    expect(mft.id).toBe("mft-042");
    expect(mft.title).toBe("WEEK_42_REUP");
    expect(mft.type).toBe("WEEKLY");
    expect(mft.status).toBe("active");
    expect(mft.estTotal).toBe(312);
    expect(mft.confidence).toBe("±7%");
    expect(mft.checkedCount).toBe(3);
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
        id: "1", title: "TEST", type: null, status: db,
        est_total: null, confidence: null, checked_count: null,
        created_at: null, updated_at: null, item_count: 0, crew_count: 0,
      };
      expect(mapDbManifestToManifestListItem(row).status).toBe(ui);
    }
  });

  it("mapDbManifestToManifestListItem handles null values", () => {
    const row = {
      id: "1", title: "TEST", type: null, status: "DRAFT",
      est_total: null, confidence: null, checked_count: null,
      created_at: null, updated_at: null, item_count: 0, crew_count: 0,
    };

    const mft = mapDbManifestToManifestListItem(row);
    expect(mft.type).toBe("");
    expect(mft.estTotal).toBe(0);
    expect(mft.confidence).toBe("");
    expect(mft.checkedCount).toBe(0);
    expect(mft.items).toEqual([]);
    expect(mft.crew).toEqual([]);
  });

  it("mapDbManifestToManifestListItem handles null title", () => {
    const row = {
      id: "1", title: null, type: null, status: "DRAFT",
      est_total: null, confidence: null, checked_count: null,
      created_at: null, updated_at: null, item_count: 0, crew_count: 0,
    };

    const mft = mapDbManifestToManifestListItem(row);
    expect(mft.title).toBe("");
  });

  it("mapDbManifestDetailToManifest maps a DB row with items and crew", () => {
    const row = {
      id: "mft-042", title: "WEEK_42_REUP", type: "WEEKLY", status: "ACTIVE",
      est_total: 312, confidence: "±7%", checked_count: 3, created_by: null,
      created_at: "2024-10-14T14:31:00Z", updated_at: "2024-10-14T14:31:00Z",
    };
    const items = [{ id: "mi-test-1", name: "Eggs", checked: true, prevPrice: 4.5, location: null, unknown: false }];
    const crew = [{ initials: "CP", name: "CAPT_PROVISIONS", role: "SECTOR_7 // HQ", color: "#4A3828", badge: "COMMANDER" }];

    const mft = mapDbManifestDetailToManifest(row, items, crew);

    expect(mft.id).toBe("mft-042");
    expect(mft.items).toHaveLength(1);
    expect(mft.crew).toHaveLength(1);
    expect(mft.items[0].name).toBe("Eggs");
    expect(mft.crew[0].initials).toBe("CP");
  });

  it("mapDbManifestDetailToManifest handles null title", () => {
    const row = {
      id: "mft-043", title: null, type: null, status: "DRAFT",
      est_total: null, confidence: null, checked_count: null, created_by: null,
      created_at: null, updated_at: null,
    };

    const mft = mapDbManifestDetailToManifest(row);
    expect(mft.title).toBe("");
  });

  it("mapDbManifestItemToManifestItem maps a DB row", () => {
    const row = {
      id: "1", manifest_id: "mft-042", item_id: null,
      item_name: "Organic Fuel Cells (Eggs)", checked: 1,
      prev_price: 4.5, location: null, is_unknown: 0,
    };

    const item = mapDbManifestItemToManifestItem(row);

    expect(item.name).toBe("Organic Fuel Cells (Eggs)");
    expect(item.checked).toBe(true);
    expect(item.prevPrice).toBe(4.5);
    expect(item.location).toBeNull();
    expect(item.unknown).toBe(false);
  });

  it("mapDbManifestItemToManifestItem handles unknown flag", () => {
    const row = {
      id: "1", manifest_id: "mft-042", item_id: null,
      item_name: "Dark Matter Spice", checked: 0,
      prev_price: null, location: null, is_unknown: 1,
    };

    const item = mapDbManifestItemToManifestItem(row);
    expect(item.unknown).toBe(true);
    expect(item.checked).toBe(false);
    expect(item.prevPrice).toBeNull();
  });

  it("mapDbCrewToCrewMember derives initials from name", () => {
    const row = {
      manifest_id: "mft-042",
      user_id: "uuid-1",
      role: "SECTOR_7 // HQ",
      name: "CAPT_PROVISIONS",
      color: "#4A3828",
    };

    const member = mapDbCrewToCrewMember(row);

    expect(member.initials).toBe("CP");
    expect(member.name).toBe("CAPT_PROVISIONS");
    expect(member.role).toBe("SECTOR_7 // HQ");
    expect(member.color).toBe("#4A3828");
    expect(member.badge).toBe("OPERATOR");
  });

  it("mapDbCrewToCrewMember handles null color", () => {
    const row = {
      manifest_id: "1", user_id: "1", role: null,
      name: "J.DAVIDSON", color: null,
    };

    const member = mapDbCrewToCrewMember(row);
    expect(member.role).toBe("");
    expect(member.color).toBe("#2A3848");
  });
});
