import { describe, it, expect, beforeAll } from "bun:test";
import { Pool } from "pg";

const db = new Pool({
  host: "localhost",
  port: 5434,
  user: "postgres",
  password: "changeme",
  database: "postgres",
  connectTimeoutMillis: 5000,
});

beforeAll(async () => {
  await db.connect();
});

describe("POST /api/nfce/webhook", () => {
  beforeAll(async () => {
    await db.connect();
  });

  it("rejects requests with missing X-API-Key header", async () => {
    const receiptId = crypto.randomUUID();

    const response = await fetch("http://localhost:3000/api/nfce/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiptId,
        seller: { name: "Test Store", cnpj: "12.345.678/0001-12" },
        items: [],
        summary: { total_items: 0, total_payable: 0 },
        invoice: { emission_type: "normal", number: 1, series: 1 },
      }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("rejects requests with invalid X-API-Key header", async () => {
    const receiptId = crypto.randomUUID();

    const response = await fetch("http://localhost:3000/api/nfce/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "invalid-key",
      },
      body: JSON.stringify({
        receiptId,
        seller: { name: "Test Store", cnpj: "12.345.678/0001-12" },
        items: [],
        summary: { total_items: 0, total_payable: 0 },
        invoice: { emission_type: "normal", number: 1, series: 1 },
      }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("rejects when receipt does not exist", async () => {
    const receiptId = crypto.randomUUID();

    const response = await fetch("http://localhost:3000/api/nfce/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NFCE_WEBHOOK_API_KEY || "test-webhook-key",
      },
      body: JSON.stringify({
        receiptId,
        seller: { name: "Test Store", cnpj: "12.345.678/0001-12" },
        items: [],
        summary: { total_items: 0, total_payable: 0 },
        invoice: { emission_type: "normal", number: 1, series: 1 },
      }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Receipt not found");
  });

  it("sets receipt status to ERR when webhook payload is invalid", async () => {
    const userId = crypto.randomUUID();
    const receiptId = crypto.randomUUID();
    const merchantId = crypto.randomUUID();

    await db.query(
      `INSERT INTO merchants (id, name, user_id, created_at) VALUES ($1, $2, $3, $4)`,
      [merchantId, "Unknown Merchant", userId, new Date().toISOString()]
    );

    await db.query(
      `INSERT INTO receipts (id, merchant_id, receipt_date, total, item_count, status, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [receiptId, merchantId, new Date().toISOString(), 0, 0, "PENDING", userId, new Date().toISOString()]
    );

    const response = await fetch("http://localhost:3000/api/nfce/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NFCE_WEBHOOK_API_KEY || "test-webhook-key",
      },
      body: JSON.stringify({
        receiptId,
        seller: { name: "", cnpj: "12.345.678/0001-12" },
        items: [],
        summary: { total_items: 0, total_payable: 10.00 },
invoice: { emission_type: "normal", number: 1, series: 1, access_key: "53260237582992000112650030000046351898724254", emission_datetime: "2026-01-15T10:30:00Z" },
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    const receiptResult = await db.query("SELECT status FROM receipts WHERE id = $1", [receiptId]);
    expect(receiptResult.rows[0].status).toBe("ERR");
  });

  it("updates temp merchant name when no existing merchant matches", async () => {
    const userId = crypto.randomUUID();
    const receiptId = crypto.randomUUID();
    const merchantId = crypto.randomUUID();

    await db.query(
      `INSERT INTO merchants (id, name, user_id, created_at) VALUES ($1, $2, $3, $4)`,
      [merchantId, "Unknown Merchant", userId, new Date().toISOString()]
    );

    await db.query(
      `INSERT INTO receipts (id, merchant_id, receipt_date, total, item_count, status, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [receiptId, merchantId, new Date().toISOString(), 0, 0, "PENDING", userId, new Date().toISOString()]
    );

    await fetch("http://localhost:3000/api/nfce/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NFCE_WEBHOOK_API_KEY || "test-webhook-key",
      },
      body: JSON.stringify({
        receiptId,
        seller: { name: "New Store Name", cnpj: "99.999.999/9999-99" },
        items: [],
        summary: { total_items: 0, total_payable: 50.00 },
        invoice: { emission_type: "normal", number: 2, series: 1, access_key: "53260237582992000112650030000046351898724255", emission_datetime: "2026-01-15T10:30:00Z" },
      }),
    });

    const merchantResult = await db.query("SELECT name, cnpj FROM merchants WHERE id = $1", [merchantId]);
    expect(merchantResult.rows[0].name).toBe("New Store Name");
    expect(merchantResult.rows[0].cnpj).toBe("99.999.999/9999-99");
  });

  it("links receipt_item to existing item when code + merchant_id match", async () => {
    const userId = crypto.randomUUID();
    const receiptId = crypto.randomUUID();
    const merchantId = crypto.randomUUID();
    const existingItemId = crypto.randomUUID();
    const cnpj = `11.111.111/1111-11${Date.now()}`;

    await db.query(
      `INSERT INTO merchants (id, name, user_id, cnpj, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [merchantId, "Test Store", userId, cnpj, new Date().toISOString()]
    );

    await db.query(
      `INSERT INTO items (id, name, code, unit, merchant_id, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [existingItemId, "Existing Item", "12345", "UN", merchantId, userId, new Date().toISOString()]
    );

    await db.query(
      `INSERT INTO receipts (id, merchant_id, receipt_date, total, item_count, status, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [receiptId, merchantId, new Date().toISOString(), 0, 0, "PENDING", userId, new Date().toISOString()]
    );

    const response = await fetch("http://localhost:3000/api/nfce/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NFCE_WEBHOOK_API_KEY || "test-webhook-key",
      },
      body: JSON.stringify({
        receiptId,
        seller: { name: "Test Store", cnpj },
        items: [
          { name: "Some Item", code: "12345", quantity: 2, unit: "UN", unit_price: 5.00, total_price: 10.00, count: 1 }
        ],
        summary: { total_items: 1, total_payable: 10.00 },
        invoice: { emission_type: "normal", number: 1, series: 1, access_key: "53260237582992000112650030000046351898724257", emission_datetime: "2026-01-15T10:30:00Z" },
      }),
    });

    expect(response.status).toBe(200);

    const receiptItemResult = await db.query("SELECT item_id, qty, unit_price, total FROM receipt_items WHERE receipt_id = $1", [receiptId]);
    expect(receiptItemResult.rows[0].item_id).toBe(existingItemId);
    expect(Number(receiptItemResult.rows[0].qty)).toBe(2);
    expect(Number(receiptItemResult.rows[0].unit_price)).toBe(5.00);
    expect(Number(receiptItemResult.rows[0].total)).toBe(10.00);
  });

  it("creates new item when code not found and links receipt_item to it", async () => {
    const userId = crypto.randomUUID();
    const receiptId = crypto.randomUUID();
    const merchantId = crypto.randomUUID();
    const cnpj = `22.222.222/2222-22${Date.now()}`;

    await db.query(
      `INSERT INTO merchants (id, name, user_id, cnpj, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [merchantId, "Test Store", userId, cnpj, new Date().toISOString()]
    );

    await db.query(
      `INSERT INTO receipts (id, merchant_id, receipt_date, total, item_count, status, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [receiptId, merchantId, new Date().toISOString(), 0, 0, "PENDING", userId, new Date().toISOString()]
    );

    const response = await fetch("http://localhost:3000/api/nfce/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NFCE_WEBHOOK_API_KEY || "test-webhook-key",
      },
      body: JSON.stringify({
        receiptId,
        seller: { name: "Test Store", cnpj },
        items: [
          { name: "New Item Created", code: "99999", quantity: 1, unit: "UN", unit_price: 15.00, total_price: 15.00, count: 1 }
        ],
        summary: { total_items: 1, total_payable: 15.00 },
        invoice: { emission_type: "normal", number: 1, series: 1, access_key: "53260237582992000112650030000046351898724258", emission_datetime: "2026-01-15T10:30:00Z" },
      }),
    });

    expect(response.status).toBe(200);

    const itemResult = await db.query("SELECT id, name, code, merchant_id FROM items WHERE code = $1 AND merchant_id = $2", ["99999", merchantId]);
    expect(itemResult.rowCount).toBe(1);
    expect(itemResult.rows[0].name).toBe("New Item Created");

    const receiptItemResult = await db.query("SELECT item_id FROM receipt_items WHERE receipt_id = $1", [receiptId]);
    expect(receiptItemResult.rows[0].item_id).toBe(itemResult.rows[0].id);
  });

  it("processes multiple items, matching some and creating others", async () => {
    const userId = crypto.randomUUID();
    const receiptId = crypto.randomUUID();
    const merchantId = crypto.randomUUID();
    const existingItemId = crypto.randomUUID();
    const cnpj = `33.333.333/3333-33${Date.now()}`;

    await db.query(
      `INSERT INTO merchants (id, name, user_id, cnpj, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [merchantId, "Test Store", userId, cnpj, new Date().toISOString()]
    );

    await db.query(
      `INSERT INTO items (id, name, code, unit, merchant_id, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [existingItemId, "Existing Item", "11111", "UN", merchantId, userId, new Date().toISOString()]
    );

    await db.query(
      `INSERT INTO receipts (id, merchant_id, receipt_date, total, item_count, status, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [receiptId, merchantId, new Date().toISOString(), 0, 0, "PENDING", userId, new Date().toISOString()]
    );

    const response = await fetch("http://localhost:3000/api/nfce/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NFCE_WEBHOOK_API_KEY || "test-webhook-key",
      },
      body: JSON.stringify({
        receiptId,
        seller: { name: "Test Store", cnpj },
        items: [
          { name: "Existing Item", code: "11111", quantity: 3, unit: "UN", unit_price: 2.00, total_price: 6.00, count: 1 },
          { name: "Brand New Item", code: "22222", quantity: 1, unit: "KG", unit_price: 10.00, total_price: 10.00, count: 1 }
        ],
        summary: { total_items: 2, total_payable: 16.00 },
        invoice: { emission_type: "normal", number: 1, series: 1, access_key: "53260237582992000112650030000046351898724259", emission_datetime: "2026-01-15T10:30:00Z" },
      }),
    });

    expect(response.status).toBe(200);

    const receiptItemsResult = await db.query("SELECT item_id FROM receipt_items WHERE receipt_id = $1 ORDER BY item_id", [receiptId]);
    expect(receiptItemsResult.rowCount).toBe(2);

    const itemsResult = await db.query("SELECT code, name FROM items WHERE merchant_id = $1 ORDER BY code", [merchantId]);
    expect(itemsResult.rowCount).toBe(2);
    expect(itemsResult.rows[0].code).toBe("11111");
    expect(itemsResult.rows[1].code).toBe("22222");
    expect(itemsResult.rows[1].name).toBe("Brand New Item");
  });
});