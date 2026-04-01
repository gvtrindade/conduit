import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/auth";

// Validation: name must be a non-empty string
function isValidName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0;
}

// Validate foreign key fields exist in database
async function isValidForeignKey(
  tableName: string,
  value: unknown,
): Promise<boolean> {
  if (!value) return true;
  const result = await db.query(`SELECT 1 FROM ${tableName} WHERE id = $1`, [value]);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  const validTokens = [
    process.env.NEXT_PUBLIC_POWERSYNC_TOKEN,
    "changeme",
  ].filter(Boolean);
  if (!validTokens.includes(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { operations } = body;

  if (!operations || !Array.isArray(operations)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let processed = 0;

  for (const operation of operations) {
    if (operation.op === "PUT" && operation.table === "items") {
      const { id, opData } = operation;

      // Guard: Validate name is non-empty string
      const name = opData?.name;
      if (!isValidName(name)) {
        return NextResponse.json(
          { error: "name", message: "name must be a non-empty string" },
          { status: 400 },
        );
      }

      // Guard: Validate category_id foreign key if provided
      const categoryId = opData?.category_id;
      if (categoryId && !(await isValidForeignKey("categories", categoryId))) {
        return NextResponse.json(
          { error: "category_id", message: "category_id does not exist" },
          { status: 400 },
        );
      }

      // Guard: Validate primary_tag_id foreign key if provided
      const primaryTagId = opData?.primary_tag_id;
      if (
        primaryTagId &&
        !(await isValidForeignKey("tags", primaryTagId))
      ) {
        return NextResponse.json(
          { error: "primary_tag_id", message: "primary_tag_id does not exist" },
          { status: 400 },
        );
      }

      let createdAt = opData?.created_at;
      if (!createdAt) {
        createdAt = new Date().toISOString();
      }

      await db.query(
        `INSERT INTO items (id, name, codename, emoji, category_id, category_custom, primary_tag_id, primary_tag_custom, unit, created_at, updated_at) 
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
 ON CONFLICT (id) DO UPDATE SET 
   name = EXCLUDED.name,
   category_id = EXCLUDED.category_id,
   primary_tag_id = EXCLUDED.primary_tag_id,
   updated_at = EXCLUDED.updated_at`,
        [
          id,
          name,
          opData.codename ?? null,
          opData.emoji ?? null,
          categoryId ?? null,
          opData.category_custom ?? null,
          primaryTagId ?? null,
          opData.primary_tag_custom,
          opData.unit,
          createdAt,
          createdAt
        ],
      );

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "items") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      // Guard: Validate name is non-empty string if provided
      if (opData.name !== undefined && !isValidName(opData.name)) {
        return NextResponse.json(
          { error: "name", message: "name must be a non-empty string" },
          { status: 400 },
        );
      }

      // Guard: Validate category_id foreign key if provided
      if (opData.category_id !== undefined) {
        if (
          opData.category_id &&
          !(await isValidForeignKey("categories", opData.category_id))
        ) {
          return NextResponse.json(
            { error: "category_id", message: "category_id does not exist" },
            { status: 400 },
          );
        }
      }

      // Guard: Validate primary_tag_id foreign key if provided
      if (opData.primary_tag_id !== undefined) {
        if (
          opData.primary_tag_id &&
          !(await isValidForeignKey("tags", opData.primary_tag_id))
        ) {
          return NextResponse.json(
            {
              error: "primary_tag_id",
              message: "primary_tag_id does not exist",
            },
            { status: 400 },
          );
        }
      }

      const fields = Object.keys(opData);
      if (fields.length === 0) {
        continue;
      }

      const setClauses = fields.map((field, index) => {
        return `${field} = $${index + 2}`;
      });

      const query = `UPDATE items SET ${setClauses.join(", ")} WHERE id = $1`;
      const values = [id, ...fields.map((field) => opData[field])];

      await db.query(query, values);

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "items") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      // Check if receipt_items table exists before checking references
      const tableCheck = await db.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'receipt_items')",
      );
      const tableExists = tableCheck.rows[0]?.exists ?? false;

      if (tableExists) {
        // Check if item is referenced in receipt_items
        const referenceCheck = await db.query(
          "SELECT COUNT(*) FROM receipt_items WHERE item_id = $1",
          [id],
        );
        const referenceCount = parseInt(
          referenceCheck.rows[0]?.count ?? "0",
          10,
        );

        if (referenceCount > 0) {
          return NextResponse.json(
            { error: "Cannot delete item: it is referenced by receipt items" },
            { status: 409 },
          );
        }
      }

      // Delete the item (idempotent - no error if doesn't exist)
      await db.query("DELETE FROM items WHERE id = $1", [id]);

      processed++;
    }

    if (operation.op === "PUT" && operation.table === "receipts") {
      const { id, opData } = operation;

      const receiptItems = opData?.receipt_items;
      const { receipt_items: _, ...receiptData } = opData || {};

      // Validate merchant_id is required and exists
      if (!receiptData?.merchant_id) {
        return NextResponse.json(
          { error: "merchant_id", message: "merchant_id is required" },
          { status: 400 },
        );
      }
      if (!(await isValidForeignKey("merchants", receiptData.merchant_id))) {
        return NextResponse.json(
          { error: "merchant_id", message: "merchant_id does not exist" },
          { status: 400 },
        );
      }

      // Validate linked_manifest_id if present
      if (receiptData?.linked_manifest_id) {
        if (!(await isValidForeignKey("manifests", receiptData.linked_manifest_id))) {
          return NextResponse.json(
            { error: "linked_manifest_id", message: "linked_manifest_id does not exist" },
            { status: 400 },
          );
        }
      }

      // Validate receipt_items have item_id
      if (receiptItems && Array.isArray(receiptItems)) {
        for (const item of receiptItems) {
          if (!item.item_id) {
            return NextResponse.json(
              { error: "item_id", message: "receipt_items[].item_id is required" },
              { status: 400 },
            );
          }
          if (!(await isValidForeignKey("items", item.item_id))) {
            return NextResponse.json(
              { error: "item_id", message: `receipt_items[].item_id ${item.item_id} does not exist` },
              { status: 400 },
            );
          }
        }
      }

      let createdAt = receiptData?.created_at;
      if (!createdAt) {
        createdAt = new Date().toISOString();
      }

      const client = await db.connect();
      try {
        await client.query("BEGIN");

        await client.query(
          `INSERT INTO receipts (id, merchant_id, receipt_date, total, item_count, status, savings, linked_manifest_id, processed_at, created_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  ON CONFLICT (id) DO UPDATE SET
    merchant_id = EXCLUDED.merchant_id,
    receipt_date = EXCLUDED.receipt_date,
    total = EXCLUDED.total,
    item_count = EXCLUDED.item_count,
    status = EXCLUDED.status,
    savings = EXCLUDED.savings,
    linked_manifest_id = EXCLUDED.linked_manifest_id,
    processed_at = EXCLUDED.processed_at`,
          [
            id,
            receiptData.merchant_id,
            receiptData?.receipt_date ?? null,
            receiptData?.total ?? null,
            receiptData?.item_count ?? null,
            receiptData?.status ?? "PENDING",
            receiptData?.savings ?? null,
            receiptData?.linked_manifest_id ?? null,
            receiptData?.processed_at ?? null,
            createdAt,
          ],
        );

        if (receiptItems && Array.isArray(receiptItems)) {
          for (const item of receiptItems) {
            await client.query(
              `INSERT INTO receipt_items (id, receipt_id, item_id, qty, unit_price, total, category_custom, tags_custom)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (id) DO UPDATE SET
    receipt_id = EXCLUDED.receipt_id,
    item_id = EXCLUDED.item_id,
    qty = EXCLUDED.qty,
    unit_price = EXCLUDED.unit_price,
    total = EXCLUDED.total,
    category_custom = EXCLUDED.category_custom,
    tags_custom = EXCLUDED.tags_custom`,
              [
                item.id,
                id,
                item.item_id ?? null,
                item.qty ?? null,
                item.unit_price ?? null,
                item.total ?? null,
                item.category_custom ?? null,
                item.tags_custom ?? null,
              ],
            );
          }
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "receipts") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      const receiptItems = opData?.receipt_items;
      const { receipt_items: _, ...receiptData } = opData || {};

      const fields = Object.keys(receiptData);
      if (fields.length === 0 && (!receiptItems || !Array.isArray(receiptItems))) {
        continue;
      }

      // Validate merchant_id if provided
      if (receiptData?.merchant_id !== undefined) {
        if (!receiptData.merchant_id) {
          return NextResponse.json(
            { error: "merchant_id", message: "merchant_id is required" },
            { status: 400 },
          );
        }
        if (!(await isValidForeignKey("merchants", receiptData.merchant_id))) {
          return NextResponse.json(
            { error: "merchant_id", message: "merchant_id does not exist" },
            { status: 400 },
          );
        }
      }

      // Validate linked_manifest_id if provided
      if (receiptData?.linked_manifest_id !== undefined && receiptData.linked_manifest_id) {
        if (!(await isValidForeignKey("manifests", receiptData.linked_manifest_id))) {
          return NextResponse.json(
            { error: "linked_manifest_id", message: "linked_manifest_id does not exist" },
            { status: 400 },
          );
        }
      }

      // Validate receipt_items have item_id
      if (receiptItems && Array.isArray(receiptItems)) {
        for (const item of receiptItems) {
          if (!item.item_id) {
            return NextResponse.json(
              { error: "item_id", message: "receipt_items[].item_id is required" },
              { status: 400 },
            );
          }
          if (!(await isValidForeignKey("items", item.item_id))) {
            return NextResponse.json(
              { error: "item_id", message: `receipt_items[].item_id ${item.item_id} does not exist` },
              { status: 400 },
            );
          }
        }
      }

      // Check receipt exists
      const existingReceipt = await db.query("SELECT id FROM receipts WHERE id = $1", [id]);
      if (existingReceipt.rowCount === null || existingReceipt.rowCount === 0) {
        return NextResponse.json(
          { error: "receipt", message: "Receipt does not exist" },
          { status: 400 },
        );
      }

      const client = await db.connect();
      try {
        await client.query("BEGIN");

        // Update receipt fields
        if (fields.length > 0) {
          const setClauses = fields.map((field, index) => {
            return `${field} = $${index + 2}`;
          });

          const query = `UPDATE receipts SET ${setClauses.join(", ")} WHERE id = $1`;
          const values = [id, ...fields.map((field) => receiptData[field])];

          await client.query(query, values);
        }

        // Upsert receipt_items
        if (receiptItems && Array.isArray(receiptItems)) {
          for (const item of receiptItems) {
            await client.query(
              `INSERT INTO receipt_items (id, receipt_id, item_id, qty, unit_price, total, category_custom, tags_custom)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (id) DO UPDATE SET
    receipt_id = EXCLUDED.receipt_id,
    item_id = EXCLUDED.item_id,
    qty = EXCLUDED.qty,
    unit_price = EXCLUDED.unit_price,
    total = EXCLUDED.total,
    category_custom = EXCLUDED.category_custom,
    tags_custom = EXCLUDED.tags_custom`,
              [
                item.id,
                id,
                item.item_id ?? null,
                item.qty ?? null,
                item.unit_price ?? null,
                item.total ?? null,
                item.category_custom ?? null,
                item.tags_custom ?? null,
              ],
            );
          }
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "receipts") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      const existingReceipt = await db.query("SELECT id FROM receipts WHERE id = $1", [id]);
      if (existingReceipt.rowCount === null || existingReceipt.rowCount === 0) {
        return NextResponse.json(
          { error: "receipt", message: "Receipt does not exist" },
          { status: 400 },
        );
      }

      const client = await db.connect();
      try {
        await client.query("BEGIN");

        await client.query("DELETE FROM receipt_items WHERE receipt_id = $1", [id]);
        await client.query("DELETE FROM receipts WHERE id = $1", [id]);

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      processed++;
    }

    if (operation.op === "PUT" && operation.table === "receipt_items") {
      const { id, opData } = operation;

      await db.query(
        `INSERT INTO receipt_items (id, receipt_id, item_id, qty, unit_price, total, category_custom, tags_custom)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
 ON CONFLICT (id) DO UPDATE SET
   receipt_id = EXCLUDED.receipt_id,
   item_id = EXCLUDED.item_id,
   qty = EXCLUDED.qty,
   unit_price = EXCLUDED.unit_price,
   total = EXCLUDED.total,
   category_custom = EXCLUDED.category_custom,
   tags_custom = EXCLUDED.tags_custom`,
        [
          id,
          opData?.receipt_id ?? null,
          opData?.item_id ?? null,
          opData?.qty ?? null,
          opData?.unit_price ?? null,
          opData?.total ?? null,
          opData?.category_custom ?? null,
          opData?.tags_custom ?? null,
        ],
      );

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "receipt_items") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      const fields = Object.keys(opData);
      if (fields.length === 0) {
        continue;
      }

      const setClauses = fields.map((field, index) => {
        return `${field} = $${index + 2}`;
      });

      const query = `UPDATE receipt_items SET ${setClauses.join(", ")} WHERE id = $1`;
      const values = [id, ...fields.map((field) => opData[field])];

      await db.query(query, values);

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "receipt_items") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await db.query("DELETE FROM receipt_items WHERE id = $1", [id]);

      processed++;
    }

    if (operation.op === "PUT" && operation.table === "merchants") {
      const { id, opData } = operation;

      const name = opData?.name;
      if (!isValidName(name)) {
        return NextResponse.json(
          { error: "name", message: "name must be a non-empty string" },
          { status: 400 }
        );
      }

      let createdAt = opData?.created_at;
      if (!createdAt) {
        createdAt = new Date().toISOString();
      }

      await db.query(
        `INSERT INTO merchants (id, name, emoji, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           emoji = EXCLUDED.emoji`,
        [
          id,
          name,
          opData?.emoji ?? null,
          createdAt
        ]
      );

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "merchants") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      if (opData.name !== undefined && !isValidName(opData.name)) {
        return NextResponse.json(
          { error: "name", message: "name must be a non-empty string" },
          { status: 400 }
        );
      }

      const fields = Object.keys(opData);
      if (fields.length === 0) {
        continue;
      }

      const setClauses = fields.map((field, index) => {
        return `${field} = $${index + 2}`;
      });

      const query = `UPDATE merchants SET ${setClauses.join(", ")} WHERE id = $1`;
      const values = [id, ...fields.map((field) => opData[field])];

      await db.query(query, values);

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "merchants") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await db.query("DELETE FROM merchants WHERE id = $1", [id]);

      processed++;
    }
  }

  return NextResponse.json({ success: true, processed });
}
