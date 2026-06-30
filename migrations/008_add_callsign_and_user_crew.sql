CREATE TABLE user_crew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_a TEXT NOT NULL REFERENCES "user"(id),
  user_id_b TEXT NOT NULL REFERENCES "user"(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  requested_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
