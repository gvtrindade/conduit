import { describe, it, expect } from "bun:test";

describe("db types exist", () => {
  it("exports Category type", async () => {
    const mod = await import("@/lib/db-types");
    const cat: mod.Category = {
      id: "uuid",
      name: "Produce",
      emoji: "🥬",
      description: "Fresh produce",
      is_controlled: true,
      created_at: new Date().toISOString(),
    };
    expect(cat.id).toBe("uuid");
    expect(cat.is_controlled).toBe(true);
  });

  it("exports Tag type", async () => {
    const mod = await import("@/lib/db-types");
    const tag: mod.Tag = {
      id: "uuid",
      name: "ORG",
      is_controlled: true,
      created_at: new Date().toISOString(),
    };
    expect(tag.name).toBe("ORG");
  });

  it("exports User type", async () => {
    const mod = await import("@/lib/db-types");
    const user: mod.User = {
      id: "uuid",
      name: "VIPER",
      email: "viper@test.com",
      rank: "SGT",
      role: "lead",
      color: "#ff0000",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(user.name).toBe("VIPER");
  });

  it("exports Merchant type", async () => {
    const mod = await import("@/lib/db-types");
    const m: mod.Merchant = {
      id: "uuid",
      name: "Sector 7 Whole Foods",
      emoji: "🛒",
      created_at: new Date().toISOString(),
    };
    expect(m.name).toBe("Sector 7 Whole Foods");
  });

  it("exports DbItem type", async () => {
    const mod = await import("@/lib/db-types");
    const item: mod.DbItem = {
      id: "uuid",
      name: "Bananas",
      codename: "BAN-001",
      emoji: "🍌",
      category_id: "uuid",
      category_custom: null,
      primary_tag_id: null,
      primary_tag_custom: "FRESH",
      unit: "kg",
      last_price: 0.63,
      last_price_date: new Date().toISOString(),
      lowest_price: 0.49,
      lowest_price_date: new Date().toISOString(),
      freq_source_id: "uuid",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(item.name).toBe("Bananas");
  });

  it("exports PriceHistory type", async () => {
    const mod = await import("@/lib/db-types");
    const ph: mod.PriceHistory = {
      id: "uuid",
      item_id: "uuid",
      price: 3.49,
      merchant_id: "uuid",
      recorded_at: new Date().toISOString(),
    };
    expect(ph.price).toBe(3.49);
  });

  it("exports ReceiptStatus enum", async () => {
    const mod = await import("@/lib/db-types");
    expect(mod.ReceiptStatus.PENDING).toBe("PENDING");
    expect(mod.ReceiptStatus.PROCESSING).toBe("PROCESSING");
    expect(mod.ReceiptStatus.OK).toBe("OK");
    expect(mod.ReceiptStatus.ERR).toBe("ERR");
  });

  it("exports DbReceipt type", async () => {
    const mod = await import("@/lib/db-types");
    const r: mod.DbReceipt = {
      id: "uuid",
      merchant_id: "uuid",
      receipt_date: new Date().toISOString(),
      total: 42.5,
      item_count: 5,
      status: mod.ReceiptStatus.OK,
      savings: 2.3,
      linked_manifest_id: null,
      processed_at: null,
      created_at: new Date().toISOString(),
    };
    expect(r.status).toBe("OK");
  });

  it("exports DbReceiptItem type", async () => {
    const mod = await import("@/lib/db-types");
    const ri: mod.DbReceiptItem = {
      id: "uuid",
      receipt_id: "uuid",
      item_id: null,
      qty: "1.4kg",
      unit_price: 0.63,
      total: 0.89,
      category_custom: "Produce",
      tags_custom: "ORG,SALE",
    };
    expect(ri.receipt_id).toBe("uuid");
  });

  it("exports ManifestStatus enum", async () => {
    const mod = await import("@/lib/db-types");
    expect(mod.ManifestStatus.DRAFT).toBe("DRAFT");
    expect(mod.ManifestStatus.ACTIVE).toBe("ACTIVE");
    expect(mod.ManifestStatus.DONE).toBe("DONE");
    expect(mod.ManifestStatus.ARCHIVED).toBe("ARCHIVED");
  });

  it("exports ManifestTypeEnum", async () => {
    const mod = await import("@/lib/db-types");
    expect(mod.ManifestType.WEEKLY).toBe("WEEKLY");
    expect(mod.ManifestType.BULK).toBe("BULK");
    expect(mod.ManifestType.MONTHLY).toBe("MONTHLY");
    expect(mod.ManifestType.HEALTH).toBe("HEALTH");
    expect(mod.ManifestType.SEASONAL).toBe("SEASONAL");
  });

  it("exports DbManifest type", async () => {
    const mod = await import("@/lib/db-types");
    const m: mod.DbManifest = {
      id: "uuid",
      title: "Weekly Run",
      type: mod.ManifestType.WEEKLY,
      status: mod.ManifestStatus.ACTIVE,
      est_total: 150.0,
      confidence: "high",
      checked_count: 3,
      created_by: "uuid",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(m.title).toBe("Weekly Run");
  });

  it("exports DbManifestItem type", async () => {
    const mod = await import("@/lib/db-types");
    const mi: mod.DbManifestItem = {
      id: "uuid",
      manifest_id: "uuid",
      item_id: "uuid",
      item_name: "Milk",
      checked: false,
      prev_price: 3.49,
      location: "Aisle 4",
      is_unknown: false,
    };
    expect(mi.checked).toBe(false);
  });

  it("exports DbManifestCrew type", async () => {
    const mod = await import("@/lib/db-types");
    const mc: mod.DbManifestCrew = {
      manifest_id: "uuid",
      user_id: "uuid",
      role: "lead",
    };
    expect(mc.role).toBe("lead");
  });

  it("categories table has user_id column", async () => {
    const { categories } = await import("@/lib/powersync/AppSchema");
    const colNames = categories.options.columns.map((c: any) => c.name);
    expect(colNames).toContain("user_id");
  });

  it("tags table has user_id column", async () => {
    const { tags } = await import("@/lib/powersync/AppSchema");
    const colNames = tags.options.columns.map((c: any) => c.name);
    expect(colNames).toContain("user_id");
  });

  it("merchants table has user_id column", async () => {
    const { merchants } = await import("@/lib/powersync/AppSchema");
    const colNames = merchants.options.columns.map((c: any) => c.name);
    expect(colNames).toContain("user_id");
  });

  it("items table has user_id column", async () => {
    const { items } = await import("@/lib/powersync/AppSchema");
    const colNames = items.options.columns.map((c: any) => c.name);
    expect(colNames).toContain("user_id");
  });

  it("receipts table has user_id column", async () => {
    const { receipts } = await import("@/lib/powersync/AppSchema");
    const colNames = receipts.options.columns.map((c: any) => c.name);
    expect(colNames).toContain("user_id");
  });

  it("manifests table has user_id column", async () => {
    const { manifests } = await import("@/lib/powersync/AppSchema");
    const colNames = manifests.options.columns.map((c: any) => c.name);
    expect(colNames).toContain("user_id");
  });
});
