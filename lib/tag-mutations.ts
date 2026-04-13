interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface TagCreateData {
  name: string;
  is_controlled: number;
  user_id: string | null;
  created_at: string | null;
}

export async function createTag(
  db: AbstractPowerSyncDatabase,
  data: TagCreateData
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO tags (
      id,
      name,
      is_controlled,
      user_id,
      created_at
    ) VALUES (?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    data.name,
    data.is_controlled,
    data.user_id,
    data.created_at || now,
  ];

  await db.execute(sql, params);
  return id;
}

export interface TagUpdateData {
  name?: string;
  is_controlled?: number;
}

export async function updateTag(
  db: AbstractPowerSyncDatabase,
  id: string,
  data: TagUpdateData,
  userId: string | null
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ["name", "is_controlled"] as const;

  for (const field of updatableFields) {
    const value = data[field];
    if (value !== undefined) {
      fields.push(`${field} = ?`);
      values.push(value);
    }
  }

  values.push(id);

  const sql = `UPDATE tags SET ${fields.join(", ")} WHERE id = ?${
    userId ? " AND user_id = ?" : ""
  }`;
  const params = userId ? [...values, userId] : values;
  await db.execute(sql, params);
}

export async function deleteTag(
  db: AbstractPowerSyncDatabase,
  id: string,
  userId: string | null
): Promise<void> {
  const sql = `DELETE FROM tags WHERE id = ?${
    userId ? " AND user_id = ?" : ""
  }`;
  await db.execute(sql, userId ? [id, userId] : [id]);
}