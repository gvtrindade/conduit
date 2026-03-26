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
