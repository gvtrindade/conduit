import { getPreference } from "./user-preferences";

interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface AddReceiptItemData {
  receiptId: string;
  itemId: string | null;
  qty: string;
  unitPrice?: number;
  receiptDate?: string;
}

export async function addReceiptItem(
  db: AbstractPowerSyncDatabase,
  data: AddReceiptItemData
): Promise<void> {
  let unitPrice: number | null = data.unitPrice ?? null;

  if (data.itemId && unitPrice === null) {
    const shouldPrefill = await getPreference(db, "prefill_price", true);

    if (shouldPrefill) {
      const itemResult = await db.execute(
        `SELECT last_price FROM items WHERE id = ?`,
        [data.itemId]
      ) as { rows: { last_price: number | null }[] };

      if (itemResult.rows.length > 0) {
        unitPrice = itemResult.rows[0].last_price;
      }
    }
  }

  const total = unitPrice != null ? (parseFloat(data.qty) || 0) * unitPrice : null;
  const id = crypto.randomUUID();

  const sql = `
    INSERT INTO receipt_items (
      id,
      receipt_id,
      item_id,
      qty,
      unit_price,
      total,
      category_custom,
      tags_custom
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await db.execute(sql, [
    id,
    data.receiptId,
    data.itemId,
    data.qty,
    unitPrice,
    total,
    null,
    null,
  ]);

  if (data.itemId && data.receiptDate && unitPrice !== null) {
    const item = await db.execute(
      `SELECT last_price, last_price_date FROM items WHERE id = ?`,
      [data.itemId]
    ) as { rows: { last_price: number | null; last_price_date: string | null }[] };

    const existing = item.rows[0];
    if (!existing) return;

    const shouldUpdate = !existing.last_price_date || 
      (data.receiptDate > existing.last_price_date);

    if (shouldUpdate) {
      await db.execute(
        `UPDATE items SET last_price = ?, last_price_date = ? WHERE id = ?`,
        [unitPrice, data.receiptDate, data.itemId]
      );
    }
  }
}

export interface UpdateReceiptItemData {
  qty?: string;
  unitPrice?: number;
  receiptDate?: string;
}

export async function updateReceiptItem(
  db: AbstractPowerSyncDatabase,
  id: string,
  data: UpdateReceiptItemData
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if ("qty" in data) {
    fields.push("qty = ?");
    values.push(data.qty);
  }

  if ("unitPrice" in data) {
    fields.push("unit_price = ?");
    values.push(data.unitPrice);
  }

  if ("qty" in data || "unitPrice" in data) {
    const qty = "qty" in data ? (data.qty ? parseFloat(data.qty) : 0) : 0;
    const price = "unitPrice" in data ? data.unitPrice : 0;
    fields.push("total = ?");
    values.push(qty * (price ?? 0));
  }

  if (fields.length === 0) return;

  values.push(id);

  const sql = `UPDATE receipt_items SET ${fields.join(", ")} WHERE id = ?`;
  await db.execute(sql, values);

  if (data.receiptDate && data.unitPrice !== undefined) {
    const receiptItem = await db.execute(
      `SELECT item_id FROM receipt_items WHERE id = ?`,
      [id]
    ) as { rows: { item_id: string | null }[] };

    const itemId = receiptItem.rows[0]?.item_id;
    if (!itemId) return;

    const item = await db.execute(
      `SELECT last_price, last_price_date FROM items WHERE id = ?`,
      [itemId]
    ) as { rows: { last_price: number | null; last_price_date: string | null }[] };

    const existing = item.rows[0];
    if (!existing) return;

    const shouldUpdate = !existing.last_price_date || 
      (data.receiptDate > existing.last_price_date);

    if (shouldUpdate && data.unitPrice !== null) {
      await db.execute(
        `UPDATE items SET last_price = ?, last_price_date = ? WHERE id = ?`,
        [data.unitPrice, data.receiptDate, itemId]
      );
    }
  }
}

export async function deleteReceiptItem(
  db: AbstractPowerSyncDatabase,
  id: string
): Promise<void> {
  await db.execute(`DELETE FROM receipt_items WHERE id = ?`, [id]);
}
