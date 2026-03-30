import { describe, it, beforeAll, afterAll, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { startPostgresContainer, getDbClient, resetSchema } from "./helpers";
import { Client } from "pg";

let client: Client;

beforeAll(async () => {
  startPostgresContainer();
  client = getDbClient();
  await client.connect();
  await resetSchema(client);

  const migrationsDir = resolve(__dirname, "../../migrations");
  for (const file of [
    "001_reference_data.sql",
    "002_users_merchants.sql",
    "003_items_price_history.sql",
    "004_receipts.sql",
  ]) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    await client.query(sql);
  }
});

afterAll(async () => {
  await client.end();
});

describe("receipt_status enum", () => {
  it("exists with correct values", async () => {
    const result = await client.query(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'receipt_status'
       ORDER BY e.enumsortorder`
    );
    const values = result.rows.map((r) => r.enumlabel);
    expect(values).toEqual(["PENDING", "PROCESSING", "OK", "ERR"]);
  });
});

describe("receipts table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'receipts'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'receipts'
       ORDER BY column_name`
    );
    const columns = Object.fromEntries(
      result.rows.map((r) => [r.column_name, r])
    );

    expect(columns.id).toBeDefined();
    expect(columns.id.data_type).toBe("uuid");
    expect(columns.id.is_nullable).toBe("NO");

    expect(columns.merchant_id).toBeDefined();
    expect(columns.merchant_id.data_type).toBe("uuid");
    expect(columns.merchant_id.is_nullable).toBe("NO");

    expect(columns.receipt_date).toBeDefined();
    expect(columns.receipt_date.data_type).toBe("timestamp with time zone");

    expect(columns.total).toBeDefined();
    expect(columns.total.data_type).toBe("numeric");

    expect(columns.item_count).toBeDefined();
    expect(columns.item_count.data_type).toBe("integer");

    expect(columns.status).toBeDefined();
    expect(columns.status.udt_name).toBe("receipt_status");

    expect(columns.savings).toBeDefined();
    expect(columns.savings.data_type).toBe("numeric");

    expect(columns.linked_manifest_id).toBeDefined();
    expect(columns.linked_manifest_id.data_type).toBe("uuid");
    expect(columns.linked_manifest_id.is_nullable).toBe("YES");

    expect(columns.processed_at).toBeDefined();
    expect(columns.processed_at.data_type).toBe("timestamp with time zone");

    expect(columns.created_at).toBeDefined();
    expect(columns.created_at.data_type).toBe("timestamp with time zone");
  });

  it("has foreign key to merchants", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'receipts'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'merchant_id'`
    );
    expect(result.rows.length).toBe(1);
  });
});

describe("receipt_items table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'receipt_items'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'receipt_items'
       ORDER BY column_name`
    );
    const columns = Object.fromEntries(
      result.rows.map((r) => [r.column_name, r])
    );

    expect(columns.id).toBeDefined();
    expect(columns.id.data_type).toBe("uuid");
    expect(columns.id.is_nullable).toBe("NO");

    expect(columns.receipt_id).toBeDefined();
    expect(columns.receipt_id.data_type).toBe("uuid");
    expect(columns.receipt_id.is_nullable).toBe("NO");

    expect(columns.item_id).toBeDefined();
    expect(columns.item_id.data_type).toBe("uuid");
    expect(columns.item_id.is_nullable).toBe("YES");

    expect(columns.item_name).toBeDefined();
    expect(columns.item_name.data_type).toBe("text");

    expect(columns.qty).toBeDefined();
    expect(columns.qty.data_type).toBe("text");

    expect(columns.unit_price).toBeDefined();
    expect(columns.unit_price.data_type).toBe("numeric");

    expect(columns.total).toBeDefined();
    expect(columns.total.data_type).toBe("numeric");

    expect(columns.category_custom).toBeDefined();
    expect(columns.category_custom.data_type).toBe("text");

    expect(columns.tags_custom).toBeDefined();
    expect(columns.tags_custom.data_type).toBe("text");
  });

  it("has foreign key to receipts", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'receipt_items'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'receipt_id'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has foreign key to items (nullable)", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'receipt_items'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'item_id'`
    );
    expect(result.rows.length).toBe(1);
  });
});
