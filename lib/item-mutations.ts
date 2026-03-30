import type { ItemsRecord } from "@/lib/powersync/AppSchema";

interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export async function createItem(
  db: AbstractPowerSyncDatabase,
  data: Omit<ItemsRecord, "id">
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO items (
      id,
      name,
      codename,
      emoji,
      category_id,
      category_custom,
      primary_tag_id,
      primary_tag_custom,
      unit,
      last_price,
      last_price_date,
      lowest_price,
      lowest_price_date,
      freq_source_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    data.name,
    data.codename,
    data.emoji,
    data.category_id,
    data.category_custom,
    data.primary_tag_id,
    data.primary_tag_custom,
    data.unit,
    data.last_price,
    data.last_price_date,
    data.lowest_price,
    data.lowest_price_date,
    data.freq_source_id,
    data.created_at || now,
    data.updated_at || now,
  ];

  await db.execute(sql, params);
  return id;
}

export async function updateItem(
  db: AbstractPowerSyncDatabase,
  id: string,
  data: Partial<Omit<ItemsRecord, "id">>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = [
    "name",
    "codename",
    "emoji",
    "category_id",
    "category_custom",
    "primary_tag_id",
    "primary_tag_custom",
    "unit",
    "last_price",
    "last_price_date",
    "lowest_price",
    "lowest_price_date",
    "freq_source_id",
  ] as const;

  for (const field of updatableFields) {
    const value = data[field];
    if (value !== undefined) {
      fields.push(`${field} = ?`);
      values.push(value);
    }
  }

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  const sql = `UPDATE items SET ${fields.join(", ")} WHERE id = ?`;
  await db.execute(sql, values);
}

export async function deleteItem(
  db: AbstractPowerSyncDatabase,
  id: string
): Promise<void> {
  const sql = `DELETE FROM items WHERE id = ?`;
  await db.execute(sql, [id]);
}

export async function checkItemHasReceipts(
  db: AbstractPowerSyncDatabase,
  id: string
): Promise<boolean> {
  const sql = `SELECT COUNT(*) as count FROM receipt_items WHERE item_id = ?`;
  const result = await db.execute(sql, [id]) as { rows: { count: number }[] };
  const row = result.rows[0];
  return (row?.count ?? 0) > 0;
}
