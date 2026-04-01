ALTER TABLE "user"
  ADD COLUMN preferences JSONB;

ALTER TABLE receipt_items
  DROP COLUMN item_name;
