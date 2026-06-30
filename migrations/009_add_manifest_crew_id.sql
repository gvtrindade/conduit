ALTER TABLE manifest_crew ADD COLUMN id UUID;

UPDATE manifest_crew SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE manifest_crew ALTER COLUMN id SET NOT NULL;

ALTER TABLE manifest_crew DROP CONSTRAINT manifest_crew_pkey;

ALTER TABLE manifest_crew ADD PRIMARY KEY (id);

ALTER TABLE manifest_crew ADD CONSTRAINT manifest_crew_unique UNIQUE (manifest_id, user_id);
