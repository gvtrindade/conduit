// Database-facing types matching PostgreSQL schema
// See migrations/ for the SQL definitions

export interface Category {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  is_controlled: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  is_controlled: boolean;
  created_at: string;
}

export interface User {
  id: string;
  callsign: string;
  email: string;
  rank: string | null;
  role: string | null;
  color: string | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: string;
  name: string;
  emoji: string | null;
  created_at: string;
}

export interface DbItem {
  id: string;
  name: string;
  codename: string | null;
  emoji: string | null;
  category_id: string | null;
  category_custom: string | null;
  primary_tag_id: string | null;
  primary_tag_custom: string | null;
  unit: string | null;
  last_price: number | null;
  last_price_date: string | null;
  lowest_price: number | null;
  lowest_price_date: string | null;
  freq_source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  item_id: string;
  price: number;
  merchant_id: string;
  recorded_at: string;
}

export const ReceiptStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  OK: "OK",
  ERR: "ERR",
} as const;

export type ReceiptStatus = (typeof ReceiptStatus)[keyof typeof ReceiptStatus];

export interface DbReceipt {
  id: string;
  merchant_id: string;
  receipt_date: string | null;
  total: number | null;
  item_count: number | null;
  status: ReceiptStatus;
  savings: number | null;
  linked_manifest_id: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface DbReceiptItem {
  id: string;
  receipt_id: string;
  item_id: string | null;
  qty: string | null;
  unit_price: number | null;
  total: number | null;
  category_custom: string | null;
  tags_custom: string | null;
}

export const ManifestStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  DONE: "DONE",
  ARCHIVED: "ARCHIVED",
} as const;

export type ManifestStatus = (typeof ManifestStatus)[keyof typeof ManifestStatus];

export const ManifestType = {
  WEEKLY: "WEEKLY",
  BULK: "BULK",
  MONTHLY: "MONTHLY",
  HEALTH: "HEALTH",
  SEASONAL: "SEASONAL",
} as const;

export type ManifestType = (typeof ManifestType)[keyof typeof ManifestType];

export interface DbManifest {
  id: string;
  title: string;
  type: ManifestType | null;
  status: ManifestStatus;
  est_total: number | null;
  confidence: string | null;
  checked_count: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbManifestItem {
  id: string;
  manifest_id: string;
  item_id: string | null;
  item_name: string | null;
  checked: boolean;
  prev_price: number | null;
  location: string | null;
  is_unknown: boolean;
}

export interface DbManifestCrew {
  manifest_id: string;
  user_id: string;
  role: string | null;
}
