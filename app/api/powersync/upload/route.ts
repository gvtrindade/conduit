import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/auth";

// Validation: name must be a non-empty string
function isValidName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0;
}

// Validate foreign key fields exist in database
async function isValidForeignKey(
  fieldName: "category_id" | "primary_tag_id",
  value: unknown,
): Promise<boolean> {
  if (!value) return true; // null/undefined is allowed (no FK)

  const tableName = fieldName === "category_id" ? "categories" : "tags";
  const result = await db.query(`SELECT 1 FROM ${tableName} WHERE id = $1`, [
    value,
  ]);
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
      if (categoryId && !(await isValidForeignKey("category_id", categoryId))) {
        return NextResponse.json(
          { error: "category_id", message: "category_id does not exist" },
          { status: 400 },
        );
      }

      // Guard: Validate primary_tag_id foreign key if provided
      const primaryTagId = opData?.primary_tag_id;
      if (
        primaryTagId &&
        !(await isValidForeignKey("primary_tag_id", primaryTagId))
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
          !(await isValidForeignKey("category_id", opData.category_id))
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
          !(await isValidForeignKey("primary_tag_id", opData.primary_tag_id))
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
  }

  return NextResponse.json({ success: true, processed });
}
