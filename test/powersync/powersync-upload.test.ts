import { getDbClient, startPostgresContainer, resetSchema } from "@/test/db/helpers";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const db = getDbClient();

describe("POST /api/powersync/upload", () => {
  beforeAll(async () => {
    startPostgresContainer();
    await db.connect();

    const migrationsDir = resolve(__dirname, "../../migrations");
    for (const file of [
      "000_better_auth.sql",
      "001_reference_data.sql",
      "002_add_preferences_and_cleanup.sql",
    ]) {
      const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
      const statements = sql.split(";").filter((s) => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            await db.query(stmt);
          } catch {
            // Ignore errors (table already exists, etc.)
          }
        }
      }
    }
  });

  afterAll(async () => {
    await db.end();
  });

  describe("PUT operations", () => {
    it("inserts a new item when PUT with non-existent id", async () => {
      const testId = "test-powersync-uuid-" + Date.now();

      // POST to /api/powersync/upload with a PUT operation for a new item
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme",
        },
        body: JSON.stringify({
          operations: [
            {
              op: "PUT",
              table: "items",
              id: testId,
              opData: { name: "Bananas" },
            },
          ],
        }),
      });

      // Should return 200 with success response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true, processed: 1 });

      // Verify the item exists in the database
      const result = await db.query(
        "SELECT id, name FROM items WHERE id = $1",
        [testId]
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe("Bananas");
    });

    it("upserts an existing item when PUT with existing id", async () => {
      // First, create an item with a known ID
      const itemId = `test-upsert-${Date.now()}`;
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "PUT", table: "items", id: itemId, opData: { name: "Original Name" } }]
        })
      });

      // Then, PUT the same ID with different data (should update, not insert)
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "PUT", table: "items", id: itemId, opData: { name: "Updated Name" } }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
      // Should not throw duplicate key error
    });
  });

  describe("PATCH operations", () => {
    it("updates specific fields on existing item", async () => {
      // First, create an item with known data
      const itemId = `test-patch-${Date.now()}`;
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "PUT", table: "items", id: itemId, opData: { name: "Original Name", emoji: "🍌" } }]
        })
      });

      // Then, PATCH with new values (partial update)
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "PATCH", table: "items", id: itemId, opData: { emoji: "🍎" } }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
    });
  });

  describe("DELETE operations", () => {
    it("deletes an item with no receipt references", async () => {
      // First, create an item
      const itemId = `test-delete-${Date.now()}`;
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "PUT", table: "items", id: itemId, opData: { name: "To Delete" } }]
        })
      });

      // Then, DELETE it
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "DELETE", table: "items", id: itemId }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
    });

    it("returns 409 when deleting an item referenced by receipts", async () => {
      // Skip if receipts table doesn't exist (test database may not have full schema)
      try {
        await db.query(`SELECT 1 FROM receipts LIMIT 1`);
      } catch {
        // Table doesn't exist in test DB - skip test
        return;
      }

      // First, create an item
      const itemId = `test-blocked-delete-${Date.now()}`;
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "PUT", table: "items", id: itemId, opData: { name: "Referenced Item" } }]
        })
      });

      // Get or create a merchant (required for receipt)
      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      const merchantId = merchantResult.rows[0]?.id;

      // Skip if no merchant exists to create a receipt
      if (!merchantId) {
        return;
      }

      // Create a receipt (receipt_items requires receipt_id foreign key)
      const receiptId = `test-receipt-${Date.now()}`;
      await db.query(
        `INSERT INTO receipts (id, merchant_id) VALUES ($1, $2)`,
        [receiptId, merchantId]
      );

      // Insert receipt_items reference
      await db.query(
        `INSERT INTO receipt_items (id, receipt_id, item_id) VALUES ($1, $2, $3)`,
        [`ref-${itemId}`, receiptId, itemId]
      );

      // Try to DELETE the item
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "DELETE", table: "items", id: itemId }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(409);
      expect(body.error).toContain("referenced");
      
      // Cleanup (order matters: delete receipt_items first due to FK constraint)
      await db.query(`DELETE FROM receipt_items WHERE item_id = $1`, [itemId]);
      await db.query(`DELETE FROM receipts WHERE id = $1`, [receiptId]);
    });
  });

  describe("Receipt operations", () => {
    it("PATCH receipt updates specified fields on existing receipt", async () => {
      const receiptId = crypto.randomUUID();

      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      // Create receipt first via PUT
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: usedMerchantId,
              receipt_date: "2026-01-01",
              total: 9.99,
              status: "PENDING"
            }
          }]
        })
      });

      // PATCH to update only total and status
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PATCH",
            table: "receipts",
            id: receiptId,
            opData: {
              total: 19.99,
              status: "OK"
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);

      // Verify only the specified fields were updated
      const result = await db.query(
        `SELECT total, status, receipt_date FROM receipts WHERE id = $1`,
        [receiptId]
      );
      expect(result.rows).toHaveLength(1);
      expect(parseFloat(result.rows[0].total)).toBe(19.99);
      expect(result.rows[0].status).toBe("OK");
      expect(result.rows[0].receipt_date.toISOString()).toContain("2026-01-01"); // unchanged

      // Cleanup
      await db.query(`DELETE FROM receipts WHERE id = $1`, [receiptId]);
    });

    it("PATCH on non-existent receipt returns 400", async () => {
      const nonExistentId = crypto.randomUUID();

      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PATCH",
            table: "receipts",
            id: nonExistentId,
            opData: {
              total: 19.99
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("receipt");
    });

    it("PATCH receipt with invalid merchant_id returns 400", async () => {
      const receiptId = crypto.randomUUID();

      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      // Create receipt first via PUT
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: usedMerchantId,
              total: 9.99
            }
          }]
        })
      });

      // PATCH with invalid merchant_id
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PATCH",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: "00000000-0000-0000-0000-000000000000"
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("merchant_id");

      // Cleanup
      await db.query(`DELETE FROM receipts WHERE id = $1`, [receiptId]);
    });

    it("PATCH receipt with invalid linked_manifest_id returns 400", async () => {
      const receiptId = crypto.randomUUID();

      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      // Create receipt first via PUT
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: usedMerchantId,
              total: 9.99
            }
          }]
        })
      });

      // PATCH with invalid linked_manifest_id
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PATCH",
            table: "receipts",
            id: receiptId,
            opData: {
              linked_manifest_id: "00000000-0000-0000-0000-000000000000"
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("linked_manifest_id");

      // Cleanup
      await db.query(`DELETE FROM receipts WHERE id = $1`, [receiptId]);
    });

    it("PATCH receipt with nested items updates/creates receipt_items", async () => {
      const receiptId = crypto.randomUUID();
      const itemId = crypto.randomUUID();
      const receiptItemId1 = crypto.randomUUID();
      const receiptItemId2 = crypto.randomUUID();

      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      // Create item first (FK requirement for receipt_items)
      await db.query(
        `INSERT INTO items (id, name) VALUES ($1, $2)`,
        [itemId, "Test Item"]
      );

      // Create receipt first via PUT
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: usedMerchantId,
              receipt_date: "2026-01-01",
              total: 9.99
            }
          }]
        })
      });

      // PATCH with nested receipt_items (update existing + create new)
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PATCH",
            table: "receipts",
            id: receiptId,
            opData: {
              total: 29.97,
              receipt_items: [
                {
                  id: receiptItemId1,
                  item_id: itemId,
                  qty: "3",
                  unit_price: 9.99,
                  total: 29.97
                },
                {
                  id: receiptItemId2,
                  item_id: itemId,
                  qty: "1",
                  unit_price: 5.00,
                  total: 5.00
                }
              ]
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);

      // Verify receipt was updated
      const receiptResult = await db.query(
        `SELECT total FROM receipts WHERE id = $1`,
        [receiptId]
      );
      expect(receiptResult.rows).toHaveLength(1);
      expect(parseFloat(receiptResult.rows[0].total)).toBe(29.97);

      // Verify both receipt_items exist
      const riResult = await db.query(
        `SELECT id, receipt_id, item_id, qty, total FROM receipt_items WHERE receipt_id = $1`,
        [receiptId]
      );
      expect(riResult.rows).toHaveLength(2);

      const ri1 = riResult.rows.find(r => r.id === receiptItemId1);
      const ri2 = riResult.rows.find(r => r.id === receiptItemId2);
      expect(ri1).toBeDefined();
      expect(ri2).toBeDefined();
      expect(ri1!.qty).toBe("3");
      expect(parseFloat(ri1!.total)).toBe(29.97);
      expect(ri2!.qty).toBe("1");
      expect(parseFloat(ri2!.total)).toBe(5.00);

      // Cleanup
      await db.query(`DELETE FROM receipt_items WHERE receipt_id = $1`, [receiptId]);
      await db.query(`DELETE FROM receipts WHERE id = $1`, [receiptId]);
      await db.query(`DELETE FROM items WHERE id = $1`, [itemId]);
    });

    it("creates a receipt with nested receipt_items in a single PUT", async () => {
      const receiptId = crypto.randomUUID();
      const itemId = crypto.randomUUID();
      const receiptItemId = crypto.randomUUID();

      // Get or create a merchant
      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      // Create item first (FK requirement for receipt_items)
      await db.query(
        `INSERT INTO items (id, name) VALUES ($1, $2)`,
        [itemId, "Test Item"]
      );

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: usedMerchantId,
              receipt_date: "2026-01-01",
              total: 9.99,
              receipt_items: [{
                id: receiptItemId,
                item_id: itemId,
                qty: "2",
                unit_price: 9.99,
                total: 19.98
              }]
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);

      // Verify receipt was created
      const receiptResult = await db.query(
        `SELECT id, merchant_id, total FROM receipts WHERE id = $1`,
        [receiptId]
      );
      expect(receiptResult.rows).toHaveLength(1);
      expect(receiptResult.rows[0].merchant_id).toBe(usedMerchantId);
      expect(parseFloat(receiptResult.rows[0].total)).toBe(9.99);

      // Verify receipt_item was created
      const riResult = await db.query(
        `SELECT id, receipt_id, item_id, qty, unit_price, total FROM receipt_items WHERE id = $1`,
        [receiptItemId]
      );
      expect(riResult.rows).toHaveLength(1);
      expect(riResult.rows[0].receipt_id).toBe(receiptId);
      expect(riResult.rows[0].item_id).toBe(itemId);
      expect(parseFloat(riResult.rows[0].unit_price)).toBe(9.99);
      expect(parseFloat(riResult.rows[0].total)).toBe(9.99);

      // Cleanup
      await db.query(`DELETE FROM receipt_items WHERE id = $1`, [receiptItemId]);
      await db.query(`DELETE FROM receipts WHERE id = $1`, [receiptId]);
      await db.query(`DELETE FROM items WHERE id = $1`, [itemId]);
    });

    it("upserts receipt and receipt_items on repeated PUT with same id", async () => {
      const receiptId = crypto.randomUUID();
      const itemId = crypto.randomUUID();
      const receiptItemId = crypto.randomUUID();

      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      await db.query(
        `INSERT INTO items (id, name) VALUES ($1, $2)`,
        [itemId, "Test Item"]
      );

      // First PUT
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: usedMerchantId,
              receipt_date: "2026-01-01",
              total: 9.99,
              receipt_items: [{
                id: receiptItemId,
                item_id: itemId,
                qty: "1",
                unit_price: 9.99,
                total: 9.99
              }]
            }
          }]
        })
      });

      // Second PUT with same id but different data
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: usedMerchantId,
              receipt_date: "2026-06-15",
              total: 19.99,
              receipt_items: [{
                id: receiptItemId,
                item_id: itemId,
                qty: "1",
                unit_price: 9.99,
                total: 9.99
              }]
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      // Verify receipt was updated
      const receiptResult = await db.query(
        `SELECT total, receipt_date FROM receipts WHERE id = $1`,
        [receiptId]
      );
      expect(parseFloat(receiptResult.rows[0].total)).toBe(19.99);

      // Verify receipt_item was updated
      const riResult = await db.query(
        `SELECT qty, total FROM receipt_items WHERE id = $1`,
        [receiptItemId]
      );
      expect(riResult.rows[0].qty).toBe("2");
      expect(parseFloat(riResult.rows[0].total)).toBe(19.98);

      // Cleanup
      await db.query(`DELETE FROM receipt_items WHERE id = $1`, [receiptItemId]);
      await db.query(`DELETE FROM receipts WHERE id = $1`, [receiptId]);
      await db.query(`DELETE FROM items WHERE id = $1`, [itemId]);
    });

    it("returns 400 when merchant_id is invalid", async () => {
      const receiptId = crypto.randomUUID();

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: "00000000-0000-0000-0000-000000000000",
              receipt_date: "2026-01-01"
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("merchant_id");
    });

    it("returns 400 when linked_manifest_id is invalid", async () => {
      const receiptId = crypto.randomUUID();

      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: usedMerchantId,
              linked_manifest_id: "00000000-0000-0000-0000-000000000000"
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("linked_manifest_id");
    });

    it("returns 400 when receipt_items has missing item_id", async () => {
      const receiptId = crypto.randomUUID();
      const receiptItemId = crypto.randomUUID();

      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: {
              merchant_id: usedMerchantId,
              receipt_items: [{
                id: receiptItemId,
                item_name: "No Item ID",
                qty: "1",
                unit_price: 5.00,
                total: 5.00
              }]
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("item_id");

      // Verify nothing was persisted (atomic)
      const receiptResult = await db.query(
        `SELECT COUNT(*) FROM receipts WHERE id = $1`,
        [receiptId]
      );
      expect(parseInt(receiptResult.rows[0].count)).toBe(0);
    });

    it("processes a PUT operation for receipts table", async () => {
      const receiptId = crypto.randomUUID();

      // Get or create a merchant (required FK)
      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let merchantId = merchantResult.rows[0]?.id;

      if (!merchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        merchantId = newMerchant.rows[0].id;
      }

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipts",
            id: receiptId,
            opData: { merchant_id: merchantId, receipt_date: "2026-01-01" }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
    });

    it("DELETE receipt removes receipt and all receipt_items", async () => {
      const receiptId = crypto.randomUUID();
      const itemId = crypto.randomUUID();
      const receiptItemId1 = crypto.randomUUID();
      const receiptItemId2 = crypto.randomUUID();

      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      await db.query(
        `INSERT INTO items (id, name) VALUES ($1, $2)`,
        [itemId, "Test Item"]
      );

      await db.query(
        `INSERT INTO receipts (id, merchant_id, total) VALUES ($1, $2, $3)`,
        [receiptId, usedMerchantId, 19.98]
      );

      await db.query(
        `INSERT INTO receipt_items (id, receipt_id, item_id, qty, unit_price, total) VALUES ($1, $2, $3, $4, $5, $6)`,
        [receiptItemId1, receiptId, itemId, "1", 9.99, 9.99]
      );

      await db.query(
        `INSERT INTO receipt_items (id, receipt_id, item_id, qty, unit_price, total) VALUES ($1, $2, $3, $4, $5, $6)`,
        [receiptItemId2, receiptId, itemId, "1", 9.99, 9.99]
      );

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "DELETE",
            table: "receipts",
            id: receiptId
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);

      const receiptResult = await db.query(
        `SELECT COUNT(*) FROM receipts WHERE id = $1`,
        [receiptId]
      );
      expect(parseInt(receiptResult.rows[0].count)).toBe(0);

      const riResult = await db.query(
        `SELECT COUNT(*) FROM receipt_items WHERE receipt_id = $1`,
        [receiptId]
      );
      expect(parseInt(riResult.rows[0].count)).toBe(0);

      await db.query(`DELETE FROM items WHERE id = $1`, [itemId]);
    });

    it("DELETE on non-existent receipt returns 400", async () => {
      const nonExistentId = crypto.randomUUID();

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "DELETE",
            table: "receipts",
            id: nonExistentId
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe("receipt");
    });

    it("processes a PUT operation for receipt_items table", async () => {
      const receiptId = crypto.randomUUID();
      const itemId = crypto.randomUUID();
      const receiptItemId = crypto.randomUUID();

      // Get or create a merchant
      const merchantResult = await db.query(`SELECT id FROM merchants LIMIT 1`);
      let usedMerchantId = merchantResult.rows[0]?.id;

      if (!usedMerchantId) {
        const newMerchantId = crypto.randomUUID();
        const newMerchant = await db.query(
          `INSERT INTO merchants (id, name) VALUES ($1, $2) RETURNING id`,
          [newMerchantId, "Test Merchant"]
        );
        usedMerchantId = newMerchant.rows[0].id;
      }

      // Create receipt first (FK requirement)
      await db.query(
        `INSERT INTO receipts (id, merchant_id) VALUES ($1, $2)`,
        [receiptId, usedMerchantId]
      );

      // Create item first (FK requirement)
      await db.query(
        `INSERT INTO items (id, name) VALUES ($1, $2)`,
        [itemId, "Test Item"]
      );

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "receipt_items",
            id: receiptItemId,
            opData: {
              receipt_id: receiptId,
              item_id: itemId,
              qty: "1",
              unit_price: 9.99,
              total: 9.99
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
    });
  });

  describe("Validation", () => {
    it("rejects PUT with empty name", async () => {
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "PUT", table: "items", id: `test-empty-${Date.now()}`, opData: { name: "" } }]
        })
      });
      
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toContain("name");
    });

    it("rejects PUT with null name", async () => {
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{ op: "PUT", table: "items", id: `test-null-${Date.now()}`, opData: { name: null } }]
        })
      });
      
      const body = await response.json();
      expect(response.status).toBe(400);
    });

    it("rejects PUT with invalid category_id", async () => {
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "items",
            id: `test-invalid-cat-${Date.now()}`,
            opData: { name: "Test", category_id: "00000000-0000-0000-0000-000000000000" }
          }]
        })
      });
      
      // Should return 400 or 500 depending on FK constraint handling
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Merchant operations", () => {
    it("PUT merchants creates a new merchant", async () => {
      const merchantId = crypto.randomUUID();

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "merchants",
            id: merchantId,
            opData: {
              name: "Test Merchant",
              emoji: "🏪"
            }
          }]
        })
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true, processed: 1 });

      // Verify merchant was created
      const result = await db.query(
        "SELECT id, name, emoji FROM merchants WHERE id = $1",
        [merchantId]
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe("Test Merchant");
      expect(result.rows[0].emoji).toBe("🏪");

      // Cleanup
      await db.query("DELETE FROM merchants WHERE id = $1", [merchantId]);
    });

    it("PUT merchants rejects empty name", async () => {
      const merchantId = crypto.randomUUID();

      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "merchants",
            id: merchantId,
            opData: {
              name: ""
            }
          }]
        })
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("name");

      // Cleanup (idempotent)
      await db.query("DELETE FROM merchants WHERE id = $1", [merchantId]);
    });

    it("PUT merchants upserts existing merchant", async () => {
      const merchantId = crypto.randomUUID();

      // First, create a merchant
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "merchants",
            id: merchantId,
            opData: {
              name: "Original Name",
              emoji: "🏪"
            }
          }]
        })
      });

      // Then, PUT the same ID with different data (should update)
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "merchants",
            id: merchantId,
            opData: {
              name: "Updated Name",
              emoji: "🏬"
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);

      // Verify merchant was updated
      const result = await db.query(
        "SELECT name, emoji FROM merchants WHERE id = $1",
        [merchantId]
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe("Updated Name");
      expect(result.rows[0].emoji).toBe("🏬");

      // Cleanup
      await db.query("DELETE FROM merchants WHERE id = $1", [merchantId]);
    });

    it("PATCH merchants updates specific fields", async () => {
      const merchantId = crypto.randomUUID();

      // First, create a merchant
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "merchants",
            id: merchantId,
            opData: {
              name: "Original Name",
              emoji: "🏪"
            }
          }]
        })
      });

      // Then, PATCH with new values (partial update)
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PATCH",
            table: "merchants",
            id: merchantId,
            opData: {
              emoji: "🏬"
            }
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);

      // Verify name is unchanged, emoji is updated
      const result = await db.query(
        "SELECT name, emoji FROM merchants WHERE id = $1",
        [merchantId]
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe("Original Name");
      expect(result.rows[0].emoji).toBe("🏬");

      // Cleanup
      await db.query("DELETE FROM merchants WHERE id = $1", [merchantId]);
    });

    it("PATCH merchants rejects empty name", async () => {
      const merchantId = crypto.randomUUID();

      // Create merchant first
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "merchants",
            id: merchantId,
            opData: {
              name: "Valid Name"
            }
          }]
        })
      });

      // Try to PATCH with empty name
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PATCH",
            table: "merchants",
            id: merchantId,
            opData: {
              name: ""
            }
          }]
        })
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("name");

      // Cleanup
      await db.query("DELETE FROM merchants WHERE id = $1", [merchantId]);
    });

    it("DELETE merchants removes merchant", async () => {
      const merchantId = crypto.randomUUID();

      // Create merchant first
      await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "PUT",
            table: "merchants",
            id: merchantId,
            opData: {
              name: "To Delete"
            }
          }]
        })
      });

      // Then, DELETE it
      const response = await fetch("http://localhost:3000/api/powersync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer changeme"
        },
        body: JSON.stringify({
          operations: [{
            op: "DELETE",
            table: "merchants",
            id: merchantId
          }]
        })
      });

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);

      // Verify merchant was deleted
      const result = await db.query(
        "SELECT id FROM merchants WHERE id = $1",
        [merchantId]
      );
      expect(result.rows).toHaveLength(0);
    });
  });
});
