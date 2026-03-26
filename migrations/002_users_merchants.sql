CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  callsign TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rank TEXT,
  role TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
