interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface MerchantCreateData {
  name: string;
  emoji: string | null;
  created_at: string | null;
}

export async function createMerchant(
  db: AbstractPowerSyncDatabase,
  data: MerchantCreateData
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO merchants (
      id,
      name,
      emoji,
      created_at
    ) VALUES (?, ?, ?, ?)
  `;

  const params = [
    id,
    data.name,
    data.emoji,
    data.created_at || now,
  ];

  await db.execute(sql, params);
  return id;
}

export interface MerchantUpdateData {
  name?: string;
  emoji?: string | null;
}

export async function updateMerchant(
  db: AbstractPowerSyncDatabase,
  id: string,
  data: MerchantUpdateData
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ["name", "emoji"] as const;

  for (const field of updatableFields) {
    const value = data[field];
    if (value !== undefined) {
      fields.push(`${field} = ?`);
      values.push(value);
    }
  }

  values.push(id);

  const sql = `UPDATE merchants SET ${fields.join(", ")} WHERE id = ?`;
  await db.execute(sql, values);
}

export async function deleteMerchant(
  db: AbstractPowerSyncDatabase,
  id: string
): Promise<void> {
  const sql = `DELETE FROM merchants WHERE id = ?`;
  await db.execute(sql, [id]);
}
