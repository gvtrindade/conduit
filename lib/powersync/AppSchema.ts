import { Schema, Table, column } from "@powersync/web";

const categories = new Table(
  {
    name: column.text,
    emoji: column.text,
    description: column.text,
    is_controlled: column.integer,
    user_id: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const tags = new Table(
  {
    name: column.text,
    is_controlled: column.integer,
    user_id: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const users = new Table(
  {
    name: column.text,
    email: column.text,
    callsign: column.text,
    rank: column.text,
    role: column.text,
    color: column.text,
    preferences: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {}, viewName: 'users' },
);

const merchants = new Table(
  {
    name: column.text,
    emoji: column.text,
    cnpj: column.text,
    user_id: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const items = new Table(
  {
    name: column.text,
    codename: column.text,
    code: column.text,
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
    user_id: column.text,
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
    user_id: column.text,
    linked_manifest_id: column.text,
    processed_at: column.text,
    created_at: column.text,
    nfce: column.text,
  },
  { indexes: {} },
);

const receipt_items = new Table(
  {
    receipt_id: column.text,
    item_id: column.text,
    item_name: column.text,
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
    status: column.text,
    merchant_name: column.text,
    items: column.text,
    user_id: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const manifest_items = new Table(
  {
    name: column.text,
    category: column.text,
    user_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const merchant_aisles = new Table(
  {
    merchant_id: column.text,
    category: column.text,
    order: column.integer,
    user_id: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const merchant_item_rules = new Table(
  {
    merchant_id: column.text,
    manifest_item_id: column.text,
    category: column.text,
    order: column.integer,
    user_id: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const manifest_crew = new Table(
  {
    id: column.text,
    manifest_id: column.text,
    user_id: column.text,
    role: column.text,
  },
  { indexes: {} },
);

const user_crew = new Table(
  {
    id: column.text,
    user_id_a: column.text,
    user_id_b: column.text,
    status: column.text,
    requested_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const processing_rules = new Table(
  {
    id: column.text,
    user_id: column.text,
    category: column.text,
    scope_entity: column.text,
    scope_id: column.text,
    config: column.text,
    enabled: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

export const AppSchema = new Schema({
  categories,
  tags,
  user: users,
  merchants,
  items,
  price_history,
  receipts,
  receipt_items,
  manifests,
  manifest_items,
  merchant_aisles,
  merchant_item_rules,
  manifest_crew,
  user_crew,
  processing_rules,
});

export { categories, tags, users, merchants, items, price_history, receipts, receipt_items, manifests, manifest_items, merchant_aisles, merchant_item_rules, manifest_crew, user_crew, processing_rules };

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
  "merchant_aisles",
  "merchant_item_rules",
  "manifest_crew",
  "user_crew",
  "processing_rules",
]);

export type Database = (typeof AppSchema)["types"];
export type CategoriesRecord = Database["categories"];
export type ItemsRecord = Database["items"];
