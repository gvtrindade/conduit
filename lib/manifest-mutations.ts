interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export async function createManifest(
  db: AbstractPowerSyncDatabase,
  userId: string | null,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO manifests (
      id,
      title,
      type,
      status,
      est_total,
      confidence,
      checked_count,
      user_id,
      created_by,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [id, null, "WEEKLY", "DRAFT", 0, null, 0, userId, null, now, now];

  await db.execute(sql, params);
  return id;
}

export async function updateManifest(
  db: AbstractPowerSyncDatabase,
  id: string,
  data: { title?: string | null; type?: string },
  userId: string | null,
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ["title", "type"] as const;

  for (const field of updatableFields) {
    const value = data[field];
    if (value !== undefined) {
      fields.push(`${field} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  const sql = `UPDATE manifests SET ${fields.join(", ")} WHERE id = ?${
    userId ? " AND user_id = ?" : ""
  }`;
  const params = userId ? [...values, userId] : values;
  await db.execute(sql, params);
}

async function getCurrentStatus(
  db: AbstractPowerSyncDatabase,
  id: string,
): Promise<string> {
  const result = (await db.execute(
    "SELECT status FROM manifests WHERE id = ?",
    [id],
  )) as { rows: { item: (idx: number) => { status: string }; length: number } };

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Manifest not found: ${id}`);
  }

  return result.rows.item(0).status;
}

async function transitionStatus(
  db: AbstractPowerSyncDatabase,
  id: string,
  fromStatus: string,
  toStatus: string,
  action: string,
): Promise<void> {
  const current = await getCurrentStatus(db, id);

  if (current !== fromStatus) {
    throw new Error(
      `Cannot ${action} manifest: status is ${current}, expected ${fromStatus}`,
    );
  }

  await db.execute(
    "UPDATE manifests SET status = ?, updated_at = ? WHERE id = ?",
    [toStatus, new Date().toISOString(), id],
  );
}

export async function activateManifest(
  db: AbstractPowerSyncDatabase,
  id: string,
): Promise<void> {
  await transitionStatus(db, id, "DRAFT", "ACTIVE", "activate");
}

export async function completeManifest(
  db: AbstractPowerSyncDatabase,
  id: string,
): Promise<void> {
  await transitionStatus(db, id, "ACTIVE", "DONE", "complete");
}

export async function archiveManifest(
  db: AbstractPowerSyncDatabase,
  id: string,
): Promise<void> {
  await transitionStatus(db, id, "DONE", "ARCHIVED", "archive");
}

export async function addManifestItem(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
  data: {
    itemId?: string | null;
    itemName: string;
    prevPrice?: number | null;
    isUnknown?: boolean;
  },
): Promise<string> {
  const id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO manifest_items (id, manifest_id, item_id, item_name, checked, prev_price, is_unknown)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      manifestId,
      data.itemId ?? null,
      data.itemName,
      0,
      data.prevPrice ?? null,
      data.isUnknown ? 1 : 0,
    ],
  );

  await recalculateEstTotal(db, manifestId);
  await recalculateCompLvl(db, manifestId);

  return id;
}

export async function recalculateEstTotal(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
): Promise<void> {
  await db.execute(
    `UPDATE manifests SET est_total = (
      SELECT COALESCE(SUM(COALESCE(prev_price, 0)), 0)
      FROM manifest_items WHERE manifest_id = ?
    ) WHERE id = ?`,
    [manifestId, manifestId],
  );
}

export async function recalculateCompLvl(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
): Promise<void> {
  const result = (await db.execute(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN checked = 1 THEN 1 ELSE 0 END) as checked
     FROM manifest_items WHERE manifest_id = ?`,
    [manifestId],
  )) as { rows: { item: (idx: number) => { total: number; checked: number }; length: number } };

  const total = result.rows.item(0).total || 0;
  const checked = result.rows.item(0).checked || 0;

  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;
  const confidence = `${percentage}%`;

  await db.execute(
    `UPDATE manifests SET checked_count = ?, confidence = ? WHERE id = ?`,
    [checked, confidence, manifestId],
  );
}

export async function removeManifestItem(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
  itemId: string,
): Promise<void> {
  await db.execute("DELETE FROM manifest_items WHERE id = ?", [itemId]);
  await recalculateEstTotal(db, manifestId);
  await recalculateCompLvl(db, manifestId);
}

export async function toggleManifestItemChecked(
  db: AbstractPowerSyncDatabase,
  itemId: string,
  checked: boolean,
): Promise<void> {
  const result = (await db.execute(
    "SELECT manifest_id FROM manifest_items WHERE id = ?",
    [itemId],
  )) as { rows: { item: (idx: number) => { manifest_id: string }; length: number } };

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Manifest item not found: ${itemId}`);
  }

  const manifestId = result.rows.item(0).manifest_id;

  await db.execute("UPDATE manifest_items SET checked = ? WHERE id = ?", [
    checked ? 1 : 0,
    itemId,
  ]);

  await recalculateCompLvl(db, manifestId);
}

export async function deleteManifest(
  db: AbstractPowerSyncDatabase,
  id: string,
  userId: string | null,
): Promise<void> {
  const result = (await db.execute(
    "SELECT id FROM manifests WHERE id = ?" + (userId ? " AND user_id = ?" : ""),
    userId ? [id, userId] : [id],
  )) as { rows: { item: (idx: number) => { id: string }; length: number } };

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Manifest not found: ${id}`);
  }

  await db.execute("DELETE FROM manifest_items WHERE manifest_id = ?", [id]);
  await db.execute("DELETE FROM manifests WHERE id = ?", [id]);
}
