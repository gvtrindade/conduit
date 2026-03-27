import type { Item } from "./types";

export const ITEMS_WITH_JOINS_QUERY = `
  SELECT
    items.id,
    items.name,
    items.codename,
    items.emoji,
    categories.name AS category_name,
    tags.name AS tag_name,
    items.unit,
    items.last_price,
    items.last_price_date,
    items.lowest_price,
    items.lowest_price_date
  FROM items
  LEFT JOIN categories ON items.category_id = categories.id
  LEFT JOIN tags ON items.primary_tag_id = tags.id
`;

export interface DbItemRow {
  id: string;
  name: string;
  codename: string | null;
  emoji: string | null;
  category_name: string | null;
  tag_name: string | null;
  unit: string | null;
  last_price: number | null;
  last_price_date: string | null;
  lowest_price: number | null;
  lowest_price_date: string | null;
}

export function mapDbItemToItem(row: DbItemRow): Item {
  const lastPrice = Number(row.last_price) || 0;
  const lowestPrice = Number(row.lowest_price) || 0;

  let delta = 0;
  let deltaDir: "up" | "down" | "flat" = "flat";
  if (lowestPrice > 0 && lastPrice !== lowestPrice) {
    delta = Math.round(((lastPrice - lowestPrice) / lowestPrice) * 100);
    deltaDir = lastPrice > lowestPrice ? "up" : "down";
  }

  let alert: "spike" | "drop" | "watch" | null = null;
  if (deltaDir === "up" && delta > 20) {
    alert = "spike";
  } else if (deltaDir === "down" && delta <= -10) {
    alert = "drop";
  } else if (deltaDir === "up" && delta > 5) {
    alert = "watch";
  }

  const tags: string[] = [];
  if (row.tag_name) {
    tags.push(row.tag_name);
  }
  if (alert === "spike") tags.push("SPIKE");
  if (alert === "drop") tags.push("DEAL");
  if (alert === "watch") tags.push("WATCH");

  return {
    id: row.id,
    name: row.name,
    codename: row.codename || "",
    emoji: row.emoji || "📦",
    category: row.category_name || "uncategorized",
    lastPrice,
    lastDate: row.last_price_date || "",
    lowestPrice,
    lowestDate: row.lowest_price_date || "",
    freqSource: "",
    unit: row.unit || "kCr / unit",
    delta: Math.abs(delta),
    deltaDir,
    alert,
    tags,
    priceHistory: [],
  };
}
