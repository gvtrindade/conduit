interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface ReceiptItemCreateData {
  item_id: string | null;
  qty: string;
  unit_price: number | null;
  total: number | null;
  category_custom: string | null;
  tags_custom: string | null;
}

export interface ReceiptCreateData {
  merchant_id: string;
  receipt_date: string | null;
  total: number | null;
  item_count: number | null;
  status: string;
  savings: number | null;
  linked_manifest_id: string | null;
  processed_at: string | null;
  created_at: string | null;
  receipt_items?: ReceiptItemCreateData[];
}

export async function createReceipt(
  db: AbstractPowerSyncDatabase,
  data: ReceiptCreateData
): Promise<string> {
  const id = crypto.randomUUID();

  const sql = `
    INSERT INTO receipts (
      id,
      merchant_id,
      receipt_date,
      total,
      item_count,
      status,
      savings,
      linked_manifest_id,
      processed_at,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    data.merchant_id,
    data.receipt_date,
    data.total,
    data.item_count,
    data.status,
    data.savings,
    data.linked_manifest_id,
    data.processed_at,
    data.created_at,
  ];

  await db.execute(sql, params);

  if (data.receipt_items && data.receipt_items.length > 0) {
    const itemSql = `
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

    for (const item of data.receipt_items) {
      const itemId = crypto.randomUUID();
      await db.execute(itemSql, [
        itemId,
        id,
        item.item_id,
        item.qty,
        item.unit_price,
        item.total,
        item.category_custom,
        item.tags_custom,
      ]);
    }
  }

  return id;
}

export interface ReceiptUpdateData {
  merchant_id?: string;
  receipt_date?: string | null;
  total?: number | null;
  item_count?: number | null;
  status?: string;
  savings?: number | null;
  linked_manifest_id?: string | null;
  processed_at?: string | null;
}

export async function updateReceipt(
  db: AbstractPowerSyncDatabase,
  id: string,
  data: ReceiptUpdateData
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = [
    "merchant_id",
    "receipt_date",
    "total",
    "item_count",
    "status",
    "savings",
    "linked_manifest_id",
    "processed_at",
  ] as const;

  for (const field of updatableFields) {
    if (field in data) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  values.push(id);

  const sql = `UPDATE receipts SET ${fields.join(", ")} WHERE id = ?`;
  await db.execute(sql, values);
}

export async function deleteReceipt(
  db: AbstractPowerSyncDatabase,
  id: string
): Promise<void> {
  const sql = `DELETE FROM receipts WHERE id = ?`;
  await db.execute(sql, [id]);
}

export async function checkReceiptExists(
  db: AbstractPowerSyncDatabase,
  id: string
): Promise<boolean> {
  const sql = `SELECT COUNT(*) as count FROM receipts WHERE id = ?`;
  const result = await db.execute(sql, [id]) as { rows: { count: number }[] };
  const row = result.rows[0];
  return (row?.count ?? 0) > 0;
}
