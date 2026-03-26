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
  for (const file of ["001_reference_data.sql", "002_users_merchants.sql", "003_items_price_history.sql"]) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    await client.query(sql);
  }
});

afterAll(async () => {
  await client.end();
});

describe("items table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'items'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'items'
       ORDER BY column_name`
    );
    const columns = Object.fromEntries(
      result.rows.map((r) => [r.column_name, r])
    );

    expect(columns.id).toBeDefined();
    expect(columns.id.data_type).toBe("uuid");
    expect(columns.id.is_nullable).toBe("NO");

    expect(columns.name).toBeDefined();
    expect(columns.name.data_type).toBe("text");
    expect(columns.name.is_nullable).toBe("NO");

    expect(columns.codename).toBeDefined();
    expect(columns.codename.data_type).toBe("text");

    expect(columns.emoji).toBeDefined();
    expect(columns.emoji.data_type).toBe("text");

    expect(columns.category_id).toBeDefined();
    expect(columns.category_id.data_type).toBe("uuid");
    expect(columns.category_id.is_nullable).toBe("YES");

    expect(columns.category_custom).toBeDefined();
    expect(columns.category_custom.data_type).toBe("text");

    expect(columns.primary_tag_id).toBeDefined();
    expect(columns.primary_tag_id.data_type).toBe("uuid");
    expect(columns.primary_tag_id.is_nullable).toBe("YES");

    expect(columns.primary_tag_custom).toBeDefined();
    expect(columns.primary_tag_custom.data_type).toBe("text");

    expect(columns.unit).toBeDefined();
    expect(columns.unit.data_type).toBe("text");

    expect(columns.last_price).toBeDefined();
    expect(columns.last_price.data_type).toBe("numeric");

    expect(columns.last_price_date).toBeDefined();
    expect(columns.last_price_date.data_type).toBe("timestamp with time zone");

    expect(columns.lowest_price).toBeDefined();
    expect(columns.lowest_price.data_type).toBe("numeric");

    expect(columns.lowest_price_date).toBeDefined();
    expect(columns.lowest_price_date.data_type).toBe("timestamp with time zone");

    expect(columns.freq_source_id).toBeDefined();
    expect(columns.freq_source_id.data_type).toBe("uuid");
    expect(columns.freq_source_id.is_nullable).toBe("YES");

    expect(columns.created_at).toBeDefined();
    expect(columns.created_at.data_type).toBe("timestamp with time zone");

    expect(columns.updated_at).toBeDefined();
    expect(columns.updated_at.data_type).toBe("timestamp with time zone");
  });

  it("has foreign key to categories", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'items'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'category_id'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has foreign key to tags", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'items'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'primary_tag_id'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has foreign key to merchants", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'items'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'freq_source_id'`
    );
    expect(result.rows.length).toBe(1);
  });
});

describe("price_history table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'price_history'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'price_history'
       ORDER BY column_name`
    );
    const columns = Object.fromEntries(
      result.rows.map((r) => [r.column_name, r])
    );

    expect(columns.id).toBeDefined();
    expect(columns.id.data_type).toBe("uuid");
    expect(columns.id.is_nullable).toBe("NO");

    expect(columns.item_id).toBeDefined();
    expect(columns.item_id.data_type).toBe("uuid");
    expect(columns.item_id.is_nullable).toBe("NO");

    expect(columns.price).toBeDefined();
    expect(columns.price.data_type).toBe("numeric");

    expect(columns.merchant_id).toBeDefined();
    expect(columns.merchant_id.data_type).toBe("uuid");
    expect(columns.merchant_id.is_nullable).toBe("NO");

    expect(columns.recorded_at).toBeDefined();
    expect(columns.recorded_at.data_type).toBe("timestamp with time zone");
  });

  it("has foreign key to items", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'price_history'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'item_id'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has foreign key to merchants", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'price_history'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'merchant_id'`
    );
    expect(result.rows.length).toBe(1);
  });
});
