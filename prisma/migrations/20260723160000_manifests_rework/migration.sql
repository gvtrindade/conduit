-- Manifests Rework Migration
-- Reshape manifests table: drop type/confidence/checked_count/est_total, add merchant_name/items JSONB
-- Reshape manifest_items table: become a catalog table (drop manifest_id/item_id/item_name/checked/prev_price/location/is_unknown, add name/category/user_id/created_at/updated_at)
-- Create merchant_aisles table
-- Create merchant_item_rules table

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reshape manifests table
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old columns
ALTER TABLE manifests DROP COLUMN IF EXISTS type;
ALTER TABLE manifests DROP COLUMN IF EXISTS confidence;
ALTER TABLE manifests DROP COLUMN IF EXISTS checked_count;
ALTER TABLE manifests DROP COLUMN IF EXISTS est_total;

-- Add new columns
ALTER TABLE manifests ADD COLUMN IF NOT EXISTS merchant_name TEXT;
ALTER TABLE manifests ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Wipe existing manifest_items rows (data migration decision from plan)
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM manifest_items;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Reshape manifest_items table (becomes a catalog table)
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old columns
ALTER TABLE manifest_items DROP COLUMN IF EXISTS manifest_id;
ALTER TABLE manifest_items DROP COLUMN IF EXISTS item_id;
ALTER TABLE manifest_items DROP COLUMN IF EXISTS item_name;
ALTER TABLE manifest_items DROP COLUMN IF EXISTS checked;
ALTER TABLE manifest_items DROP COLUMN IF EXISTS prev_price;
ALTER TABLE manifest_items DROP COLUMN IF EXISTS location;
ALTER TABLE manifest_items DROP COLUMN IF EXISTS is_unknown;

-- Add new columns
ALTER TABLE manifest_items ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE manifest_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE manifest_items ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE manifest_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE manifest_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Make name NOT NULL after backfilling
ALTER TABLE manifest_items ALTER COLUMN name SET NOT NULL;
ALTER TABLE manifest_items ALTER COLUMN user_id SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Create merchant_aisles table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_aisles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(merchant_id, category)
);

CREATE INDEX IF NOT EXISTS idx_merchant_aisles_merchant_id ON merchant_aisles(merchant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Create merchant_item_rules table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_item_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  manifest_item_id UUID NOT NULL REFERENCES manifest_items(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(merchant_id, manifest_item_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_item_rules_merchant_id ON merchant_item_rules(merchant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Set existing manifests' items to empty array (safety net)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE manifests SET items = '[]'::jsonb WHERE items IS NULL;

COMMIT;
