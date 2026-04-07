interface SubmittedItem {
  receiptItemId: string;
  itemId?: string;
  qty: string;
  unitPrice: number;
}

interface OriginalItem {
  receiptItemId: string;
  qty: string;
  unitPrice: number;
}

interface ItemDiff {
  deletedIds: string[];
  updatedItems: Array<{ receiptItemId: string; qty: string; unitPrice: number }>;
  newItems: Array<{ itemId: string; qty: string; unitPrice: number }>;
}

export function computeItemDiff(
  originalItems: OriginalItem[],
  submittedItems: SubmittedItem[]
): ItemDiff {
  const submittedById = new Map(
    submittedItems.filter(i => i.receiptItemId).map(i => [i.receiptItemId, i])
  );

  const deletedIds: string[] = [];
  const updatedItems: Array<{ receiptItemId: string; qty: string; unitPrice: number }> = [];
  const newItems: Array<{ itemId: string; qty: string; unitPrice: number }> = [];

  for (const original of originalItems) {
    const submitted = submittedById.get(original.receiptItemId);
    if (!submitted) {
      deletedIds.push(original.receiptItemId);
    } else if (submitted.qty !== original.qty || submitted.unitPrice !== original.unitPrice) {
      updatedItems.push({
        receiptItemId: original.receiptItemId,
        qty: submitted.qty,
        unitPrice: submitted.unitPrice,
      });
    }
  }

  for (const item of submittedItems) {
    if (!item.receiptItemId && item.itemId) {
      newItems.push({
        itemId: item.itemId,
        qty: item.qty,
        unitPrice: item.unitPrice,
      });
    }
  }

  return { deletedIds, updatedItems, newItems };
}

interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface SaveReceiptEditsParams {
  receiptId: string;
  merchantId: string;
  date: string;
  total: number;
  itemCount: number;
  originalItems: OriginalItem[];
  submittedItems: SubmittedItem[];
}

export async function saveReceiptEdits(
  db: AbstractPowerSyncDatabase,
  params: SaveReceiptEditsParams,
  deps: {
    updateReceipt: typeof import("@/lib/receipt-mutations").updateReceipt;
    deleteReceiptItem: typeof import("@/lib/receipt-item-mutations").deleteReceiptItem;
    updateReceiptItem: typeof import("@/lib/receipt-item-mutations").updateReceiptItem;
    addReceiptItem: typeof import("@/lib/receipt-item-mutations").addReceiptItem;
  }
): Promise<void> {
  const { updateReceipt, deleteReceiptItem, updateReceiptItem, addReceiptItem } = deps;

  await updateReceipt(db, params.receiptId, {
    merchant_id: params.merchantId,
    receipt_date: params.date || null,
    total: params.total,
    item_count: params.itemCount,
  });

  const diff = computeItemDiff(params.originalItems, params.submittedItems);

  for (const id of diff.deletedIds) {
    await deleteReceiptItem(db, id);
  }

  for (const item of diff.updatedItems) {
    await updateReceiptItem(db, item.receiptItemId, {
      qty: item.qty,
      unitPrice: item.unitPrice,
      receiptDate: params.date,
    });
  }

  for (const item of diff.newItems) {
    await addReceiptItem(db, {
      receiptId: params.receiptId,
      itemId: item.itemId,
      qty: item.qty,
      unitPrice: item.unitPrice,
      receiptDate: params.date,
    });
  }
}
