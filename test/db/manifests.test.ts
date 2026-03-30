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
    "005_manifests.sql",
  ]) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    await client.query(sql);
  }
});

afterAll(async () => {
  await client.end();
});

describe("manifest_status enum", () => {
  it("exists with correct values", async () => {
    const result = await client.query(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'manifest_status'
       ORDER BY e.enumsortorder`
    );
    const values = result.rows.map((r) => r.enumlabel);
    expect(values).toEqual(["DRAFT", "ACTIVE", "DONE", "ARCHIVED"]);
  });
});

describe("manifest_type enum", () => {
  it("exists with correct values", async () => {
    const result = await client.query(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'manifest_type'
       ORDER BY e.enumsortorder`
    );
    const values = result.rows.map((r) => r.enumlabel);
    expect(values).toEqual(["WEEKLY", "BULK", "MONTHLY", "HEALTH", "SEASONAL"]);
  });
});

describe("manifests table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'manifests'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'manifests'
       ORDER BY column_name`
    );
    const columns = Object.fromEntries(
      result.rows.map((r) => [r.column_name, r])
    );

    expect(columns.id).toBeDefined();
    expect(columns.id.data_type).toBe("uuid");
    expect(columns.id.is_nullable).toBe("NO");

    expect(columns.title).toBeDefined();
    expect(columns.title.data_type).toBe("text");
    expect(columns.title.is_nullable).toBe("NO");

    expect(columns.type).toBeDefined();
    expect(columns.type.udt_name).toBe("manifest_type");

    expect(columns.status).toBeDefined();
    expect(columns.status.udt_name).toBe("manifest_status");

    expect(columns.est_total).toBeDefined();
    expect(columns.est_total.data_type).toBe("numeric");

    expect(columns.confidence).toBeDefined();
    expect(columns.confidence.data_type).toBe("text");

    expect(columns.checked_count).toBeDefined();
    expect(columns.checked_count.data_type).toBe("integer");

    expect(columns.created_by).toBeDefined();
    expect(columns.created_by.data_type).toBe("uuid");
    expect(columns.created_by.is_nullable).toBe("YES");

    expect(columns.created_at).toBeDefined();
    expect(columns.created_at.data_type).toBe("timestamp with time zone");

    expect(columns.updated_at).toBeDefined();
    expect(columns.updated_at.data_type).toBe("timestamp with time zone");
  });

  it("has foreign key to users", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'manifests'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'created_by'`
    );
    expect(result.rows.length).toBe(1);
  });
});

describe("manifest_items table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'manifest_items'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'manifest_items'
       ORDER BY column_name`
    );
    const columns = Object.fromEntries(
      result.rows.map((r) => [r.column_name, r])
    );

    expect(columns.id).toBeDefined();
    expect(columns.id.data_type).toBe("uuid");
    expect(columns.id.is_nullable).toBe("NO");

    expect(columns.manifest_id).toBeDefined();
    expect(columns.manifest_id.data_type).toBe("uuid");
    expect(columns.manifest_id.is_nullable).toBe("NO");

    expect(columns.item_id).toBeDefined();
    expect(columns.item_id.data_type).toBe("uuid");
    expect(columns.item_id.is_nullable).toBe("YES");

    expect(columns.item_name).toBeDefined();
    expect(columns.item_name.data_type).toBe("text");

    expect(columns.checked).toBeDefined();
    expect(columns.checked.data_type).toBe("boolean");

    expect(columns.prev_price).toBeDefined();
    expect(columns.prev_price.data_type).toBe("numeric");

    expect(columns.location).toBeDefined();
    expect(columns.location.data_type).toBe("text");

    expect(columns.is_unknown).toBeDefined();
    expect(columns.is_unknown.data_type).toBe("boolean");
  });

  it("has foreign key to manifests", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'manifest_items'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'manifest_id'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has foreign key to items (nullable)", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'manifest_items'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'item_id'`
    );
    expect(result.rows.length).toBe(1);
  });
});

describe("manifest_crew table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'manifest_crew'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'manifest_crew'
       ORDER BY column_name`
    );
    const columns = Object.fromEntries(
      result.rows.map((r) => [r.column_name, r])
    );

    expect(columns.manifest_id).toBeDefined();
    expect(columns.manifest_id.data_type).toBe("uuid");
    expect(columns.manifest_id.is_nullable).toBe("NO");

    expect(columns.user_id).toBeDefined();
    expect(columns.user_id.data_type).toBe("uuid");
    expect(columns.user_id.is_nullable).toBe("NO");

    expect(columns.role).toBeDefined();
    expect(columns.role.data_type).toBe("text");
  });

  it("has foreign key to manifests", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'manifest_crew'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'manifest_id'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has foreign key to users", async () => {
    const result = await client.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'manifest_crew'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'user_id'`
    );
    expect(result.rows.length).toBe(1);
  });
});
