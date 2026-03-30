import { describe, it, expect } from "bun:test";
import { mapDbItemToItem, ITEMS_WITH_JOINS_QUERY } from "@/lib/item-queries";

describe("Item queries", () => {
  it("ITEMS_WITH_JOINS_QUERY joins categories and tags", () => {
    expect(ITEMS_WITH_JOINS_QUERY).toContain("JOIN categories");
    expect(ITEMS_WITH_JOINS_QUERY).toContain("JOIN tags");
    expect(ITEMS_WITH_JOINS_QUERY).toContain("category_name");
    expect(ITEMS_WITH_JOINS_QUERY).toContain("tag_name");
  });

  it("mapDbItemToItem maps a basic DB row to UI Item type", () => {
    const row = {
      id: "uuid-1",
      name: "Bananas",
      codename: "PLASMA_CONDUIT",
      emoji: "🍌",
      category_name: "produce",
      tag_name: "ORGANIC",
      unit: "kCr / kg",
      last_price: 0.89,
      last_price_date: "2024-10-12",
      lowest_price: 0.72,
      lowest_price_date: "2024-08-20",
    };

    const item = mapDbItemToItem(row);

    expect(item.id).toBe("uuid-1");
    expect(item.name).toBe("Bananas");
    expect(item.codename).toBe("PLASMA_CONDUIT");
    expect(item.emoji).toBe("🍌");
    expect(item.category).toBe("produce");
    expect(item.unit).toBe("kCr / kg");
    expect(item.lastPrice).toBe(0.89);
    expect(item.lowestPrice).toBe(0.72);
  });

  it("mapDbItemToItem computes delta direction 'down' when price above lowest", () => {
    const row = {
      id: "1",
      name: "Test",
      codename: "TEST",
      emoji: "🧪",
      category_name: "pantry",
      tag_name: null,
      unit: "kCr / unit",
      last_price: 5.0,
      last_price_date: null,
      lowest_price: 4.0,
      lowest_price_date: null,
    };

    const item = mapDbItemToItem(row);
    // last_price (5.0) > lowest_price (4.0) → direction is 'up' (price went up from lowest)
    expect(item.deltaDir).toBe("up");
    expect(item.delta).toBe(25); // (5-4)/4 * 100 = 25%
  });

  it("mapDbItemToItem computes delta direction 'up' when last equals lowest", () => {
    const row = {
      id: "1",
      name: "Test",
      codename: "TEST",
      emoji: "🧪",
      category_name: "pantry",
      tag_name: null,
      unit: "kCr / unit",
      last_price: 4.0,
      last_price_date: null,
      lowest_price: 4.0,
      lowest_price_date: null,
    };

    const item = mapDbItemToItem(row);
    expect(item.deltaDir).toBe("flat");
    expect(item.delta).toBe(0);
  });

  it("mapDbItemToItem sets alert 'spike' when price increased >20% from lowest", () => {
    const row = {
      id: "1",
      name: "Test",
      codename: "TEST",
      emoji: "🧪",
      category_name: "bev",
      tag_name: "SPIKE",
      unit: "kCr / unit",
      last_price: 5.49,
      last_price_date: null,
      lowest_price: 3.99,
      lowest_price_date: null,
    };

    const item = mapDbItemToItem(row);
    expect(item.alert).toBe("spike");
  });

  it("mapDbItemToItem sets alert 'drop' when price is at or near lowest", () => {
    const row = {
      id: "1",
      name: "Test",
      codename: "TEST",
      emoji: "🧪",
      category_name: "produce",
      tag_name: "DEAL",
      unit: "kCr / kg",
      last_price: 0.89,
      last_price_date: null,
      lowest_price: 0.72,
      lowest_price_date: null,
    };

    const item = mapDbItemToItem(row);
    // (0.89-0.72)/0.72 = 23.6% > 20% → spike
    expect(item.alert).toBe("spike");
  });

  it("mapDbItemToItem handles null values gracefully", () => {
    const row = {
      id: "1",
      name: "Unknown Item",
      codename: null,
      emoji: null,
      category_name: null,
      tag_name: null,
      unit: null,
      last_price: null,
      last_price_date: null,
      lowest_price: null,
      lowest_price_date: null,
    };

    const item = mapDbItemToItem(row);
    expect(item.codename).toBe("");
    expect(item.emoji).toBe("📦");
    expect(item.category).toBe("uncategorized");
    expect(item.tags).toEqual([]);
    expect(item.lastPrice).toBe(0);
    expect(item.lowestPrice).toBe(0);
    expect(item.deltaDir).toBe("flat");
    expect(item.alert).toBeNull();
  });

  it("mapDbItemToItem includes tag in tags array", () => {
    const row = {
      id: "1",
      name: "Test",
      codename: "TEST",
      emoji: "🧪",
      category_name: "dairy",
      tag_name: "ORGANIC",
      unit: "kCr / unit",
      last_price: 4.5,
      last_price_date: null,
      lowest_price: 4.0,
      lowest_price_date: null,
    };

    const item = mapDbItemToItem(row);
    expect(item.tags).toContain("ORGANIC");
  });
});
