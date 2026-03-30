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

  const migrationSql = readFileSync(
    resolve(__dirname, "../../migrations/001_reference_data.sql"),
    "utf-8"
  );
  await client.query(migrationSql);
});

afterAll(async () => {
  await client.end();
});

describe("categories table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'categories'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'categories'
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

    expect(columns.description).toBeDefined();
    expect(columns.description.data_type).toBe("text");

    expect(columns.is_controlled).toBeDefined();
    expect(columns.is_controlled.data_type).toBe("boolean");

    expect(columns.created_at).toBeDefined();
    expect(columns.created_at.data_type).toBe("timestamp with time zone");
  });
});

describe("tags table", () => {
  it("exists after migration", async () => {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'tags'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("has all expected columns", async () => {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tags'
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

    expect(columns.is_controlled).toBeDefined();
    expect(columns.is_controlled.data_type).toBe("boolean");

    expect(columns.created_at).toBeDefined();
    expect(columns.created_at.data_type).toBe("timestamp with time zone");
  });
});
