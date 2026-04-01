import { Schema, Table, column } from "@powersync/web";

const categories = new Table(
  {
    name: column.text,
    emoji: column.text,
    description: column.text,
    is_controlled: column.integer,
    created_at: column.text,
  },
  { indexes: {} },
);

const tags = new Table(
  {
    name: column.text,
    is_controlled: column.integer,
    created_at: column.text,
  },
  { indexes: {} },
);

const users = new Table(
  {
    callsign: column.text,
    email: column.text,
    rank: column.text,
    role: column.text,
    color: column.text,
    preferences: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const merchants = new Table(
  {
    name: column.text,
    emoji: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const items = new Table(
  {
    name: column.text,
    codename: column.text,
    emoji: column.text,
    category_id: column.text,
    category_custom: column.text,
    primary_tag_id: column.text,
    primary_tag_custom: column.text,
    unit: column.text,
    last_price: column.real,
    last_price_date: column.text,
    lowest_price: column.real,
    lowest_price_date: column.text,
    freq_source_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const price_history = new Table(
  {
    item_id: column.text,
    price: column.real,
    merchant_id: column.text,
    recorded_at: column.text,
  },
  { indexes: {} },
);

const receipts = new Table(
  {
    merchant_id: column.text,
    receipt_date: column.text,
    total: column.real,
    item_count: column.integer,
    status: column.text,
    savings: column.real,
    linked_manifest_id: column.text,
    processed_at: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const receipt_items = new Table(
  {
    receipt_id: column.text,
    item_id: column.text,
    qty: column.text,
    unit_price: column.real,
    total: column.real,
    category_custom: column.text,
    tags_custom: column.text,
  },
  { indexes: {} },
);

const manifests = new Table(
  {
    title: column.text,
    type: column.text,
    status: column.text,
    est_total: column.real,
    confidence: column.text,
    checked_count: column.integer,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const manifest_items = new Table(
  {
    manifest_id: column.text,
    item_id: column.text,
    item_name: column.text,
    checked: column.integer,
    prev_price: column.real,
    location: column.text,
    is_unknown: column.integer,
  },
  { indexes: {} },
);

const manifest_crew = new Table(
  {
    manifest_id: column.text,
    user_id: column.text,
    role: column.text,
  },
  { indexes: {} },
);

export const AppSchema = new Schema({
  categories,
  tags,
  users,
  merchants,
  items,
  price_history,
  receipts,
  receipt_items,
  manifests,
  manifest_items,
  manifest_crew,
});

export const ALLOWED_TABLES = new Set([
  "categories",
  "tags",
  "users",
  "merchants",
  "items",
  "price_history",
  "receipts",
  "receipt_items",
  "manifests",
  "manifest_items",
  "manifest_crew",
]);

export type Database = (typeof AppSchema)["types"];
export type CategoriesRecord = Database["categories"];
export type ItemsRecord = Database["items"];
