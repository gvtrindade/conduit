import { getDbClient } from "@/db/test/helpers";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";

const db = getDbClient();

describe("POST /api/powersync/upload", () => {
  beforeAll(async () => {
    await db.connect();
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
        `INSERT INTO receipt_items (id, receipt_id, item_id, item_name) VALUES ($1, $2, $3, $4)`,
        [`ref-${itemId}`, receiptId, itemId, "Referenced Item"]
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
});
