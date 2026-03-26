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
