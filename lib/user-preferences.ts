interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export async function getPreference<T>(
  db: AbstractPowerSyncDatabase,
  key: string,
  defaultValue?: T
): Promise<T | undefined> {
  const result = await db.execute(
    `SELECT preferences FROM users LIMIT 1`
  ) as { rows: { preferences: string | null }[] };

  if (result.rows.length === 0 || result.rows[0].preferences == null) {
    return defaultValue;
  }

  const prefs = JSON.parse(result.rows[0].preferences);
  return prefs[key] ?? defaultValue;
}

export async function setPreference(
  db: AbstractPowerSyncDatabase,
  key: string,
  value: unknown
): Promise<void> {
  const result = await db.execute(
    `SELECT preferences FROM users LIMIT 1`
  ) as { rows: { preferences: string | null }[] };

  let prefs: Record<string, unknown> = {};
  if (result.rows.length > 0 && result.rows[0].preferences) {
    prefs = JSON.parse(result.rows[0].preferences);
  }

  prefs[key] = value;

  await db.execute(
    `UPDATE users SET preferences = ?`,
    [JSON.stringify(prefs)]
  );
}
