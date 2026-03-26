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
  created_by UUID REFERENCES users(id),
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
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT,
  PRIMARY KEY (manifest_id, user_id)
);
