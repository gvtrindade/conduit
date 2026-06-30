import { createMerchant } from "./merchant-mutations";
import { createReceipt, type ReceiptCreateData } from "./receipt-mutations";

const UNKNOWN_MERCHANT_NAME = "Unknown Merchant";

interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export async function callNFCEApi(receiptId: string, key: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_NFCE_API_URL || "http://192.168.1.10:9090";
  if (!apiUrl) {
    return;
  }

  const projectUrl = process.env.NEXT_PUBLIC_PROJECT_URL || "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const body = JSON.stringify({
      receiptId,
      chave: key,
      projectUrl,
    });

    const res = await fetch(`${apiUrl}/api/nfce/receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown');
      console.error(`NFCe API returned ${res.status}: ${text}`);
    }

    clearTimeout(timeoutId);
  } catch (err) {
    console.error('NFCe API call failed:', err);
  }
}

export async function createPendingReceiptFromQR(
  db: AbstractPowerSyncDatabase,
  chave: string,
  userId: string | null,
): Promise<string> {
  const merchantId = await createMerchant(db, {
    name: UNKNOWN_MERCHANT_NAME,
    emoji: null,
    user_id: userId,
    created_at: null,
  });

  const receiptData: ReceiptCreateData = {
    merchant_id: merchantId,
    receipt_date: null,
    total: null,
    item_count: null,
    status: "PENDING",
    savings: null,
    user_id: userId,
    linked_manifest_id: null,
    processed_at: null,
    created_at: new Date().toISOString(),
    nfce: chave,
  };

  const receiptId = await createReceipt(db, receiptData);

  callNFCEApi(receiptId, chave);

  return receiptId;
}

export async function reprocessReceipt(
  db: AbstractPowerSyncDatabase,
  receiptId: string,
): Promise<void> {
  const result = await db.execute(
    "SELECT nfce FROM receipts WHERE id = ?",
    [receiptId],
  ) as { rows: { nfce: string | null }[] };
  const row = result.rows[0];
  if (!row || !row.nfce) {
    throw new Error("Cannot reprocess: no nfce key found for receipt");
  }

  await db.execute(
    "UPDATE receipts SET status = ? WHERE id = ?",
    ["PENDING", receiptId],
  );

  callNFCEApi(receiptId, row.nfce);
}
