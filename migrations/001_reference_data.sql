ALTER TABLE "user" 
  ADD COLUMN callsign TEXT NOT NULL,
  ADD COLUMN rank TEXT,
  ADD COLUMN role TEXT,
  ADD COLUMN color TEXT;

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  is_controlled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_controlled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  codename TEXT,
  emoji TEXT,
  category_id UUID REFERENCES categories(id),
  category_custom TEXT,
  primary_tag_id UUID REFERENCES tags(id),
  primary_tag_custom TEXT,
  unit TEXT,
  last_price NUMERIC,
  last_price_date TIMESTAMPTZ,
  lowest_price NUMERIC,
  lowest_price_date TIMESTAMPTZ,
  freq_source_id UUID REFERENCES merchants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  price NUMERIC NOT NULL,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE receipt_status AS ENUM ('PENDING', 'PROCESSING', 'OK', 'ERR');

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  receipt_date TIMESTAMPTZ,
  total NUMERIC,
  item_count INTEGER,
  status receipt_status NOT NULL DEFAULT 'PENDING',
  savings NUMERIC,
  linked_manifest_id UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id),
  item_id UUID REFERENCES items(id),
  item_name TEXT,
  qty TEXT,
  unit_price NUMERIC,
  total NUMERIC,
  category_custom TEXT,
  tags_custom TEXT
);

CREATE TYPE manifest_status AS ENUM ('DRAFT', 'ACTIVE', 'DONE', 'ARCHIVED');
CREATE TYPE manifest_type AS ENUM ('WEEKLY', 'BULK', 'MONTHLY', 'HEALTH', 'SEASONAL');

CREATE TABLE manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type manifest_type,
  status manifest_status NOT NULL DEFAULT 'DRAFT',
  est_total NUMERIC,
  confidence TEXT,
  checked_count INTEGER DEFAULT 0,
  created_by TEXT REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE manifest_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id UUID NOT NULL REFERENCES manifests(id),
  item_id UUID REFERENCES items(id),
  item_name TEXT,
  checked BOOLEAN NOT NULL DEFAULT false,
  prev_price NUMERIC,
  location TEXT,
  is_unknown BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE manifest_crew (
  manifest_id UUID NOT NULL REFERENCES manifests(id),
  user_id TEXT NOT NULL REFERENCES "user"(id),
  role TEXT,
  PRIMARY KEY (manifest_id, user_id)
);
