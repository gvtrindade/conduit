import { createMerchant } from "./merchant-mutations";
import { createReceipt, type ReceiptCreateData } from "./receipt-mutations";

const UNKNOWN_MERCHANT_NAME = "Unknown Merchant";

interface AbstractPowerSyncDatabase {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

async function callNFCEApi(receiptId: string, key: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_NFCE_API_URL;
  if (!apiUrl) {
    return;
  }

  const projectUrl = process.env.NEXT_PUBLIC_PROJECT_URL || "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const body = JSON.stringify({
      receiptId,
      key,
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

    console.log(res);

    clearTimeout(timeoutId);
  } catch (err) {
    console.error(err);
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
  };

  const receiptId = await createReceipt(db, receiptData);

  callNFCEApi(receiptId, chave);

  return receiptId;
}
