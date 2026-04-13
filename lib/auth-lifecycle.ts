import type { PowerSyncDatabase } from "@powersync/web";

const USER_TABLES = [
  "items",
  "manifests",
  "merchants",
  "categories",
  "tags",
  "receipts",
];

export async function signupMigrateLocalToDb(
  db: PowerSyncDatabase,
  userId: string
): Promise<number> {
  let totalMigrated = 0;
  for (const table of USER_TABLES) {
    const result = await db.execute(
      `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`,
      [userId]
    );
    totalMigrated += result.rowsAffected;
  }
  return totalMigrated;
}
