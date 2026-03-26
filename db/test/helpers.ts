import { execSync } from "child_process";
import { Client } from "pg";

const CONTAINER_NAME = "conduit-test-pg";
const PG_PORT = 54333;
const PG_PASSWORD = "test-password";
const PG_DATABASE = "conduit_test";
const PG_USER = "postgres";

const connectionConfig = {
  host: "localhost",
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
};

export function startPostgresContainer() {
  // Check if already running
  try {
    execSync(
      `docker exec ${CONTAINER_NAME} pg_isready -U ${PG_USER}`,
      { stdio: "pipe" }
    );
    return; // Already running
  } catch {
    // Not running, start it
  }

  // Clean up any stopped container with the same name
  try {
    execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: "pipe" });
  } catch {}

  execSync(
    `docker run -d --name ${CONTAINER_NAME} ` +
      `-e POSTGRES_PASSWORD=${PG_PASSWORD} ` +
      `-e POSTGRES_DB=${PG_DATABASE} ` +
      `-p ${PG_PORT}:5432 ` +
      `postgres:16-alpine`,
    { stdio: "pipe" }
  );

  // Wait for PostgreSQL to be ready
  let retries = 30;
  while (retries > 0) {
    try {
      execSync(
        `docker exec ${CONTAINER_NAME} pg_isready -U ${PG_USER}`,
        { stdio: "pipe" }
      );
      return;
    } catch {
      retries--;
      execSync("sleep 1");
    }
  }
  throw new Error("PostgreSQL container failed to start");
}

export function stopPostgresContainer() {
  try {
    execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: "pipe" });
  } catch {
    // Container doesn't exist, that's fine
  }
}

export function getDbClient(): Client {
  return new Client(connectionConfig);
}

export async function resetSchema(client: Client) {
  await client.query("DROP SCHEMA public CASCADE");
  await client.query("CREATE SCHEMA public");
}
