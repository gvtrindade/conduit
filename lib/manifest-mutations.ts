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
      status,
      items,
      user_id,
      created_by,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [id, null, "DRAFT", "[]", userId, userId, now, now];

  await db.execute(sql, params);

  if (userId) {
    await db.execute(
      "INSERT INTO manifest_crew (id, manifest_id, user_id, role) VALUES (?, ?, ?, 'COMMANDER')",
        [crypto.randomUUID(), id, userId],
    );
  }

  return id;
}

export async function updateManifest(
  db: AbstractPowerSyncDatabase,
  id: string,
  data: { title?: string | null; merchant_name?: string | null },
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ["title", "merchant_name"] as const;

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

  await db.execute(
    `UPDATE manifests SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
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

// Parse items JSON from manifest
function parseItems(itemsJson: string | null | undefined): any[] {
  if (!itemsJson) return [];
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Add item to manifest's JSON blob
export async function addManifestItem(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
  data: {
    manifestItemId?: string | null;
    name: string;
    estimated_cost?: string;
    category?: string | null;
  },
): Promise<string> {
  // Get current items
  const result = (await db.execute(
    "SELECT items FROM manifests WHERE id = ?",
    [manifestId],
  )) as { rows: { item: (idx: number) => { items: string }; length: number } };

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Manifest not found: ${manifestId}`);
  }

  const items = parseItems(result.rows.item(0).items);

  // Create new item with unique ID
  const itemUuid = crypto.randomUUID();
  const newItem = {
    manifest_item_id: data.manifestItemId || null,
    name: data.name,
    estimated_cost: data.estimated_cost || "0",
    checked: false,
    category: data.category || null,
  };

  items.push(newItem);

  // Update manifest with new items JSON
  await db.execute(
    "UPDATE manifests SET items = ?, updated_at = ? WHERE id = ?",
    [JSON.stringify(items), new Date().toISOString(), manifestId],
  );

  return itemUuid;
}

// Toggle checked status in JSON blob
export async function toggleManifestItemChecked(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
  itemIndex: number,
  checked: boolean,
): Promise<void> {
  const result = (await db.execute(
    "SELECT items FROM manifests WHERE id = ?",
    [manifestId],
  )) as { rows: { item: (idx: number) => { items: string }; length: number } };

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Manifest not found: ${manifestId}`);
  }

  const items = parseItems(result.rows.item(0).items);

  if (itemIndex < 0 || itemIndex >= items.length) {
    throw new Error(`Invalid item index: ${itemIndex}`);
  }

  items[itemIndex].checked = checked;

  await db.execute(
    "UPDATE manifests SET items = ?, updated_at = ? WHERE id = ?",
    [JSON.stringify(items), new Date().toISOString(), manifestId],
  );
}

// Remove item from JSON blob
export async function removeManifestItem(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
  itemIndex: number,
): Promise<void> {
  const result = (await db.execute(
    "SELECT items FROM manifests WHERE id = ?",
    [manifestId],
  )) as { rows: { item: (idx: number) => { items: string }; length: number } };

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Manifest not found: ${manifestId}`);
  }

  const items = parseItems(result.rows.item(0).items);

  if (itemIndex < 0 || itemIndex >= items.length) {
    throw new Error(`Invalid item index: ${itemIndex}`);
  }

  items.splice(itemIndex, 1);

  await db.execute(
    "UPDATE manifests SET items = ?, updated_at = ? WHERE id = ?",
    [JSON.stringify(items), new Date().toISOString(), manifestId],
  );
}

// Delete manifest
export async function deleteManifest(
  db: AbstractPowerSyncDatabase,
  id: string,
  userId: string | null,
): Promise<void> {
  const result = (await db.execute(
    "SELECT id FROM manifests WHERE id = ?" + (userId ? " AND created_by = ?" : ""),
    userId ? [id, userId] : [id],
  )) as { rows: { item: (idx: number) => { id: string }; length: number } };

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Manifest not found: ${id}`);
  }

  await db.execute("DELETE FROM manifests WHERE id = ?", [id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog items (manifest_items table)
// ─────────────────────────────────────────────────────────────────────────────

export async function createCatalogItem(
  db: AbstractPowerSyncDatabase,
  userId: string,
  data: { name: string; category?: string | null },
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO manifest_items (id, name, category, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.category || null, userId, now, now],
  );

  return id;
}

export async function updateCatalogItem(
  db: AbstractPowerSyncDatabase,
  id: string,
  userId: string,
  data: { name?: string; category?: string | null },
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }

  if (data.category !== undefined) {
    fields.push("category = ?");
    values.push(data.category);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);
  values.push(userId);

  await db.execute(
    `UPDATE manifest_items SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    values,
  );
}

export async function deleteCatalogItem(
  db: AbstractPowerSyncDatabase,
  id: string,
  userId: string,
): Promise<void> {
  await db.execute(
    "DELETE FROM manifest_items WHERE id = ? AND user_id = ?",
    [id, userId],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Merchant aisles
// ─────────────────────────────────────────────────────────────────────────────

export async function createMerchantAisle(
  db: AbstractPowerSyncDatabase,
  merchantId: string,
  userId: string,
  category: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Get max order for this merchant
  const result = (await db.execute(
    'SELECT COALESCE(MAX("order"), 0) as max_order FROM merchant_aisles WHERE merchant_id = ?',
    [merchantId],
  )) as { rows: { item: (idx: number) => { max_order: number }; length: number } };

  const maxOrder = result.rows?.length > 0 ? result.rows.item(0).max_order : 0;
  const newOrder = maxOrder + 1;

  await db.execute(
    `INSERT INTO merchant_aisles (id, merchant_id, category, "order", user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, merchantId, category, newOrder, userId, now],
  );

  return id;
}

export async function updateMerchantAisle(
  db: AbstractPowerSyncDatabase,
  id: string,
  merchantId: string,
  userId: string,
  data: { category: string },
): Promise<void> {
  await db.execute(
    `UPDATE merchant_aisles SET category = ? WHERE id = ? AND merchant_id = ? AND user_id = ?`,
    [data.category, id, merchantId, userId],
  );
}

export async function updateMerchantAisleOrder(
  db: AbstractPowerSyncDatabase,
  merchantId: string,
  userId: string,
  orderedAisleIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedAisleIds.length; i++) {
    await db.execute(
      `UPDATE merchant_aisles SET "order" = ? WHERE id = ? AND merchant_id = ? AND user_id = ?`,
      [i + 1, orderedAisleIds[i], merchantId, userId],
    );
  }
}

export async function deleteMerchantAisle(
  db: AbstractPowerSyncDatabase,
  id: string,
  merchantId: string,
  userId: string,
): Promise<void> {
  await db.execute(
    "DELETE FROM merchant_aisles WHERE id = ? AND merchant_id = ? AND user_id = ?",
    [id, merchantId, userId],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category operations across ALL of the user's merchants
// (merchant_aisles rows share a free-text `category` string scoped per user)
// ─────────────────────────────────────────────────────────────────────────────

// Rename a category across every merchant aisle the user owns. Because
// (merchant_id, category) is UNIQUE, a merchant that already has an aisle with
// the target name would conflict — those pre-existing target rows are removed
// first (effectively merging the two aisles inside that merchant).
export async function renameMerchantCategory(
  db: AbstractPowerSyncDatabase,
  userId: string,
  oldCategory: string,
  newCategory: string,
): Promise<void> {
  const target = newCategory.trim().toUpperCase();
  if (target === oldCategory.toUpperCase()) return;

  // Drop any aisle that already uses the target category for merchants that
  // also have the source category, to avoid a UNIQUE violation on rename.
  await db.execute(
    `DELETE FROM merchant_aisles
      WHERE user_id = ?
        AND category = ?
        AND merchant_id IN (
          SELECT merchant_id FROM merchant_aisles
          WHERE user_id = ? AND category = ?
        )`,
    [userId, target, userId, oldCategory],
  );

  await db.execute(
    `UPDATE merchant_aisles SET category = ? WHERE user_id = ? AND category = ?`,
    [target, userId, oldCategory],
  );
}

// Delete every aisle that uses the given category, across all of the user's
// merchants.
export async function deleteMerchantCategory(
  db: AbstractPowerSyncDatabase,
  userId: string,
  category: string,
): Promise<void> {
  await db.execute(
    "DELETE FROM merchant_aisles WHERE user_id = ? AND category = ?",
    [userId, category],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Merchant item rules
// ─────────────────────────────────────────────────────────────────────────────

export async function createMerchantItemRule(
  db: AbstractPowerSyncDatabase,
  merchantId: string,
  manifestItemId: string,
  userId: string,
  category: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Get max order for this merchant
  const result = (await db.execute(
    'SELECT COALESCE(MAX("order"), 0) as max_order FROM merchant_item_rules WHERE merchant_id = ?',
    [merchantId],
  )) as { rows: { item: (idx: number) => { max_order: number }; length: number } };

  const maxOrder = result.rows?.length > 0 ? result.rows.item(0).max_order : 0;
  const newOrder = maxOrder + 1;

  await db.execute(
    `INSERT INTO merchant_item_rules (id, merchant_id, manifest_item_id, category, "order", user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, merchantId, manifestItemId, category, newOrder, userId, now],
  );

  return id;
}

export async function updateMerchantItemRule(
  db: AbstractPowerSyncDatabase,
  id: string,
  merchantId: string,
  userId: string,
  data: { category?: string; order?: number },
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.category !== undefined) {
    fields.push("category = ?");
    values.push(data.category);
  }

  if (data.order !== undefined) {
    fields.push('"order" = ?');
    values.push(data.order);
  }

  if (fields.length === 0) return;

  values.push(id);
  values.push(merchantId);
  values.push(userId);

  await db.execute(
    `UPDATE merchant_item_rules SET ${fields.join(", ")} WHERE id = ? AND merchant_id = ? AND user_id = ?`,
    values,
  );
}

export async function updateMerchantItemRuleOrder(
  db: AbstractPowerSyncDatabase,
  merchantId: string,
  userId: string,
  orderedRuleIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedRuleIds.length; i++) {
    await db.execute(
      `UPDATE merchant_item_rules SET "order" = ? WHERE id = ? AND merchant_id = ? AND user_id = ?`,
      [i + 1, orderedRuleIds[i], merchantId, userId],
    );
  }
}

export async function deleteMerchantItemRule(
  db: AbstractPowerSyncDatabase,
  id: string,
  merchantId: string,
  userId: string,
): Promise<void> {
  await db.execute(
    "DELETE FROM merchant_item_rules WHERE id = ? AND merchant_id = ? AND user_id = ?",
    [id, merchantId, userId],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule application (client-side)
// ─────────────────────────────────────────────────────────────────────────────

// Apply merchant rules to manifest items
export async function applyMerchantRules(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
  merchantId: string,
): Promise<void> {
  // Get manifest items JSON
  const manifestResult = (await db.execute(
    "SELECT items FROM manifests WHERE id = ?",
    [manifestId],
  )) as { rows: { item: (idx: number) => { items: string }; length: number } };

  if (!manifestResult.rows || manifestResult.rows.length === 0) {
    throw new Error(`Manifest not found: ${manifestId}`);
  }

  const items = parseItems(manifestResult.rows.item(0).items);

  // Get rules for this merchant
  const rulesResult = (await db.execute(
    `SELECT manifest_item_id, category FROM merchant_item_rules WHERE merchant_id = ?`,
    [merchantId],
  )) as { rows: { item: (idx: number) => { manifest_item_id: string; category: string }; length: number } };

  if (!rulesResult.rows || rulesResult.rows.length === 0) {
    return; // No rules to apply
  }

  const rulesMap = new Map<string, string>();
  for (let i = 0; i < rulesResult.rows.length; i++) {
    const rule = rulesResult.rows.item(i);
    rulesMap.set(rule.manifest_item_id, rule.category);
  }

  // Apply rules to items
  let changed = false;
  for (const item of items) {
    if (item.manifest_item_id && rulesMap.has(item.manifest_item_id)) {
      item.category = rulesMap.get(item.manifest_item_id);
      changed = true;
    }
  }

  if (changed) {
    await db.execute(
      "UPDATE manifests SET items = ?, updated_at = ? WHERE id = ?",
      [JSON.stringify(items), new Date().toISOString(), manifestId],
    );
  }
}

// Re-resolve rules when merchant changes (reset to catalog defaults, then apply new merchant's rules)
export async function resolveMerchantRules(
  db: AbstractPowerSyncDatabase,
  manifestId: string,
  merchantId: string | null,
): Promise<void> {
  // Get manifest items JSON
  const manifestResult = (await db.execute(
    "SELECT items FROM manifests WHERE id = ?",
    [manifestId],
  )) as { rows: { item: (idx: number) => { items: string }; length: number } };

  if (!manifestResult.rows || manifestResult.rows.length === 0) {
    throw new Error(`Manifest not found: ${manifestId}`);
  }

  const items = parseItems(manifestResult.rows.item(0).items);

  // Reset categories to catalog defaults
  for (const item of items) {
    if (item.manifest_item_id) {
      // Get catalog item's category
      const catalogResult = (await db.execute(
        "SELECT category FROM manifest_items WHERE id = ?",
        [item.manifest_item_id],
      )) as { rows: { item: (idx: number) => { category: string | null }; length: number } };

      if (catalogResult.rows?.length > 0) {
        item.category = catalogResult.rows.item(0).category;
      }
    }
  }

  // Apply new merchant's rules if merchant is set
  if (merchantId) {
    const rulesResult = (await db.execute(
      `SELECT manifest_item_id, category FROM merchant_item_rules WHERE merchant_id = ?`,
      [merchantId],
    )) as { rows: { item: (idx: number) => { manifest_item_id: string; category: string }; length: number } };

    if (rulesResult.rows?.length > 0) {
      const rulesMap = new Map<string, string>();
      for (let i = 0; i < rulesResult.rows.length; i++) {
        const rule = rulesResult.rows.item(i);
        rulesMap.set(rule.manifest_item_id, rule.category);
      }

      for (const item of items) {
        if (item.manifest_item_id && rulesMap.has(item.manifest_item_id)) {
          item.category = rulesMap.get(item.manifest_item_id);
        }
      }
    }
  }

  await db.execute(
    "UPDATE manifests SET items = ?, updated_at = ? WHERE id = ?",
    [JSON.stringify(items), new Date().toISOString(), manifestId],
  );
}
