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

  // Run reference data migration first (categories/tags are referenced later)
  const referenceSql = readFileSync(
    resolve(__dirname, "../../migrations/001_reference_data.sql"),
    "utf-8"
  );
  await client.query(referenceSql);

  const migrationSql = readFileSync(
    resolve(__dirname, "../../migrations/002_users_merchants.sql"),
    "utf-8"
  );
  await client.query(migrationSql);
});

afterAll(async () => {
  await client.end();
});

describe("users table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'users'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'
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

    expect(columns.email).toBeDefined();
    expect(columns.email.data_type).toBe("text");
    expect(columns.email.is_nullable).toBe("NO");

    expect(columns.rank).toBeDefined();
    expect(columns.rank.data_type).toBe("text");

    expect(columns.role).toBeDefined();
    expect(columns.role.data_type).toBe("text");

    expect(columns.color).toBeDefined();
    expect(columns.color.data_type).toBe("text");

    expect(columns.created_at).toBeDefined();
    expect(columns.created_at.data_type).toBe("timestamp with time zone");

    expect(columns.updated_at).toBeDefined();
    expect(columns.updated_at.data_type).toBe("timestamp with time zone");
  });
});

describe("merchants table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'merchants'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'merchants'
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

    expect(columns.emoji).toBeDefined();
    expect(columns.emoji.data_type).toBe("text");

    expect(columns.created_at).toBeDefined();
    expect(columns.created_at.data_type).toBe("timestamp with time zone");
  });
});
