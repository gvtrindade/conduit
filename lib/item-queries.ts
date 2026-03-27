import type { Item, PricePoint } from "./types";

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

// Item detail query with category join
export const ITEM_DETAIL_QUERY = `
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
    items.lowest_price_date,
    merchants.name AS freq_source_name
  FROM items
  LEFT JOIN categories ON items.category_id = categories.id
  LEFT JOIN tags ON items.primary_tag_id = tags.id
  LEFT JOIN merchants ON items.freq_source_id = merchants.id
  WHERE items.id = ?
`;

// Price history query for an item
export const PRICE_HISTORY_QUERY = `
  SELECT
    price_history.price,
    price_history.recorded_at
  FROM price_history
  WHERE price_history.item_id = ?
  ORDER BY price_history.recorded_at ASC
`;

export interface DbPriceHistoryRow {
  price: number;
  recorded_at: string;
}

// Recent receipts containing this item
export const ITEM_RECEIPTS_QUERY = `
  SELECT
    receipts.id,
    merchants.name AS merchant_name,
    receipts.receipt_date,
    receipt_items.unit_price,
    receipt_items.total
  FROM receipt_items
  JOIN receipts ON receipt_items.receipt_id = receipts.id
  LEFT JOIN merchants ON receipts.merchant_id = merchants.id
  WHERE receipt_items.item_id = ?
  ORDER BY receipts.receipt_date DESC
  LIMIT 5
`;

export interface DbItemReceiptRow {
  id: string;
  merchant_name: string | null;
  receipt_date: string | null;
  unit_price: number | null;
  total: number | null;
}

export function mapDbPriceHistoryToPricePoint(row: DbPriceHistoryRow): PricePoint {
  const date = new Date(row.recorded_at);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return {
    month: months[date.getUTCMonth()] || '',
    price: Number(row.price) || 0,
  };
}
