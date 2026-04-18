import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const db = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT || "5434"),
  database: process.env.PG_DATABASE || "postgres",
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "changeme",
});

function isValidApiKey(key: string): boolean {
  const validKey = process.env.NFCE_WEBHOOK_API_KEY;
  return validKey !== undefined && key === validKey;
}

interface WebhookPayload {
  receiptId: string;
  data: NfceData;
}

interface NfceData {
  seller: {
    name: string;
    cnpj: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    };
  };
  items: Array<{
    name: string;
    code?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    count: number;
  }>;
  summary: {
    total_items: number;
    total_payable: number;
  };
  invoice: {
    emission_type: string;
    number: number;
    series: number;
    access_key: string;
    emission_datetime: string;
  };
}

function hasRequiredFields(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) return false;

  const p = payload as Record<string, unknown>;

  if (typeof p.receiptId !== "string" || !p.receiptId) return false;
  if (typeof p.seller !== "object" || p.seller === null) return false;
  if (!Array.isArray(p.items)) return false;
  if (typeof p.summary !== "object" || p.summary === null) return false;
  if (typeof p.invoice !== "object" || p.invoice === null) return false;

  return true;
}

function isValidSellerData(payload: WebhookPayload): boolean {
  const { data: { seller, invoice } } = payload;
  return !!seller.name && !!seller.cnpj && !!invoice.emission_datetime;
}

function parseBrDateTime(dateStr: string): string {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):\s*(\d{2}):\s*(\d{2})$/);
  if (!match) return new Date().toISOString();
  const [, day, month, year, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour.padStart(2, "0")}:${minute}:${second}`;
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey || !isValidApiKey(apiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // if (!hasRequiredFields(body)) {
  //   return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
  // }

  const payload = body as WebhookPayload;
  const { receiptId, data: { seller, items, summary, invoice } } = payload;
  const validData = isValidSellerData(payload);

  const client = await db.connect();
  try {
    const receiptResult = await client.query(
      "SELECT id, merchant_id, user_id FROM receipts WHERE id = $1",
      [receiptId]
    );

    if (receiptResult.rowCount === null || receiptResult.rowCount === 0) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const receipt = receiptResult.rows[0];
    const tempMerchantId = receipt.merchant_id;
    const userId = receipt.user_id;

    const receiptDate = parseBrDateTime(invoice.emission_datetime);

    if (validData) {
      const existingMerchantResult = await client.query(
        "SELECT id FROM merchants WHERE cnpj = $1 AND user_id = $2",
        [seller.cnpj, userId]
      );

      let finalMerchantId: string;

      if (existingMerchantResult.rowCount !== null && existingMerchantResult.rowCount > 0) {
        finalMerchantId = existingMerchantResult.rows[0].id;
        await client.query("UPDATE receipts SET merchant_id = $1 WHERE id = $2", [finalMerchantId, receiptId]);
        if (tempMerchantId !== finalMerchantId) {
          await client.query("DELETE FROM merchants WHERE id = $1", [tempMerchantId]);
        }
      } else {
        await client.query(
          "UPDATE merchants SET name = $1, cnpj = $2 WHERE id = $3",
          [seller.name, seller.cnpj, tempMerchantId]
        );
        finalMerchantId = tempMerchantId;
      }

      for (const item of items) {
        const existingItemResult = await client.query(
          "SELECT id FROM items WHERE code = $1 AND merchant_id = $2",
          [item.code || null, finalMerchantId]
        );

        let itemId: string;

        if (existingItemResult.rowCount !== null && existingItemResult.rowCount > 0) {
          itemId = existingItemResult.rows[0].id;
        } else {
          itemId = crypto.randomUUID();
          await client.query(
            `INSERT INTO items (id, name, code, unit, merchant_id, user_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [itemId, item.name, item.code || null, item.unit, finalMerchantId, userId, new Date().toISOString()]
          );
        }

        await client.query(
          `INSERT INTO receipt_items (id, receipt_id, item_id, qty, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [crypto.randomUUID(), receiptId, itemId, item.quantity, item.unit_price, item.total_price]
        );
      }

      await client.query(
        `UPDATE receipts SET
           merchant_id = $1,
           receipt_date = $2,
           total = $3,
           item_count = $4,
           status = $5
         WHERE id = $6`,
        [finalMerchantId, receiptDate, summary.total_payable, summary.total_items, "OK", receiptId]
      );
    } else {
      await client.query(
        "UPDATE receipts SET status = $1 WHERE id = $2",
        ["ERR", receiptId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);

    try {
      await client.query(
        "UPDATE receipts SET status = $1 WHERE id = $2",
        ["ERR", receiptId]
      );
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}