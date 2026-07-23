import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManifestStatus, ReceiptStatus } from "@/prisma/generated/client";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Validation: name must be a non-empty string
function isValidName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0;
}

const VALID_MANIFEST_STATUSES = Object.values(ManifestStatus);

function isValidManifestStatus(status: unknown): status is string {
  return (
    typeof status === "string" &&
    (VALID_MANIFEST_STATUSES as readonly string[]).includes(status)
  );
}

const ALLOWED_STATUS_TRANSITIONS: Record<string, string> = {
  DRAFT: "ACTIVE",
  ACTIVE: "DONE",
  DONE: "ARCHIVED",
};

// Validate foreign key fields exist in database, via the Prisma entities.
const FK_CHECKERS = {
  categories: (id: string) =>
    prisma.category.findUnique({ where: { id }, select: { id: true } }),
  tags: (id: string) =>
    prisma.tag.findUnique({ where: { id }, select: { id: true } }),
  merchants: (id: string) =>
    prisma.merchant.findUnique({ where: { id }, select: { id: true } }),
  manifests: (id: string) =>
    prisma.manifest.findUnique({ where: { id }, select: { id: true } }),
  items: (id: string) =>
    prisma.item.findUnique({ where: { id }, select: { id: true } }),
  manifest_items: (id: string) =>
    prisma.manifestItem.findUnique({ where: { id }, select: { id: true } }),
} as const;

async function isValidForeignKey(
  tableName: keyof typeof FK_CHECKERS,
  value: unknown,
): Promise<boolean> {
  if (!value) return true;
  const row = await FK_CHECKERS[tableName](value as string);
  return row !== null;
}

// Parse items JSON string to JSONB, or return null
function normalizeItemsJson(v: unknown): any {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (Array.isArray(v)) return v;
  return null;
}

// The "user" table uses camelCase columns (better-auth) but the PowerSync
// client sends snake_case for created_at/updated_at, and preferences as a
// JSON string. Remap to the Prisma User field names / JSON value.
function normalizePreferences(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

function remapUserData(opData: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(opData)) {
    if (k === "created_at") out.createdAt = v;
    else if (k === "updated_at") out.updatedAt = v;
    else if (k === "preferences") out.preferences = normalizePreferences(v);
    else out[k] = v;
  }
  return out;
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

  const headersList = await headers();
  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: headersList });
    userId = session?.user?.id ?? null;
  } catch {
    userId = null;
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

      await prisma.item.upsert({
        where: { id },
        create: {
          id,
          name,
          codename: opData.codename ?? null,
          emoji: opData.emoji ?? null,
          category_id: categoryId ?? null,
          category_custom: opData.category_custom ?? null,
          primary_tag_id: primaryTagId ?? null,
          primary_tag_custom: opData.primary_tag_custom ?? null,
          unit: opData.unit,
          user_id: userId as string,
          created_at: createdAt,
          updated_at: createdAt,
        },
        update: {
          name,
          category_id: categoryId ?? null,
          primary_tag_id: primaryTagId ?? null,
          user_id: userId as string,
          updated_at: createdAt,
        },
      });

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
      if (opData.category_id !== undefined && opData.category_id !== "uncategorized") {
        if (
          opData.category_id &&
          !(await isValidForeignKey("categories", opData.category_id))
        ) {
          return NextResponse.json(
            { error: "category_id", message: "category_id does not exist" },
            { status: 400 },
          );
        }
      } else if (opData.category_id === "uncategorized") {
        // "uncategorized" means clear the category (set NULL), matching the
        // previous raw-SQL behaviour (pg treated the undefined param as NULL).
        opData.category_id = null;
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

      await prisma.item.updateMany({ where: { id }, data: opData });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "items") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      // Check if item is referenced in receipt_items
      const referenceCount = await prisma.receiptItem.count({
        where: { item_id: id },
      });

      if (referenceCount > 0) {
        return NextResponse.json(
          { error: "Cannot delete item: it is referenced by receipt items" },
          { status: 409 },
        );
      }

      // Delete the item (idempotent - no error if doesn't exist)
      await prisma.item.deleteMany({ where: { id } });

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

      await prisma.$transaction(async (tx) => {
        await tx.receipt.upsert({
          where: { id },
          create: {
            id,
            merchant_id: receiptData.merchant_id,
            receipt_date: receiptData?.receipt_date ?? null,
            total: receiptData?.total ?? null,
            item_count: receiptData?.item_count ?? null,
            status: receiptData?.status ?? ReceiptStatus.PENDING,
            savings: receiptData?.savings ?? null,
            linked_manifest_id: receiptData?.linked_manifest_id ?? null,
            processed_at: receiptData?.processed_at ?? null,
            user_id: userId,
            created_at: createdAt,
            nfce: receiptData?.nfce ?? null,
          },
          update: {
            merchant_id: receiptData.merchant_id,
            receipt_date: receiptData?.receipt_date ?? null,
            total: receiptData?.total ?? null,
            item_count: receiptData?.item_count ?? null,
            status: receiptData?.status ?? ReceiptStatus.PENDING,
            savings: receiptData?.savings ?? null,
            linked_manifest_id: receiptData?.linked_manifest_id ?? null,
            processed_at: receiptData?.processed_at ?? null,
            user_id: userId,
            nfce: receiptData?.nfce ?? null,
          },
        });

        if (receiptItems && Array.isArray(receiptItems)) {
          for (const item of receiptItems) {
            await tx.receiptItem.upsert({
              where: { id: item.id },
              create: {
                id: item.id,
                receipt_id: id,
                item_id: item.item_id ?? null,
                qty: item.qty ?? null,
                unit_price: item.unit_price ?? null,
                total: item.total ?? null,
                category_custom: item.category_custom ?? null,
                tags_custom: item.tags_custom ?? null,
              },
              update: {
                receipt_id: id,
                item_id: item.item_id ?? null,
                qty: item.qty ?? null,
                unit_price: item.unit_price ?? null,
                total: item.total ?? null,
                category_custom: item.category_custom ?? null,
                tags_custom: item.tags_custom ?? null,
              },
            });
          }
        }
      });

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
      const existingReceipt = await prisma.receipt.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existingReceipt) {
        return NextResponse.json(
          { error: "receipt", message: "Receipt does not exist" },
          { status: 400 },
        );
      }

      await prisma.$transaction(async (tx) => {
        // Update receipt fields
        if (fields.length > 0) {
          await tx.receipt.updateMany({ where: { id }, data: receiptData });
        }

        // Upsert receipt_items
        if (receiptItems && Array.isArray(receiptItems)) {
          for (const item of receiptItems) {
            await tx.receiptItem.upsert({
              where: { id: item.id },
              create: {
                id: item.id,
                receipt_id: id,
                item_id: item.item_id ?? null,
                qty: item.qty ?? null,
                unit_price: item.unit_price ?? null,
                total: item.total ?? null,
                category_custom: item.category_custom ?? null,
                tags_custom: item.tags_custom ?? null,
              },
              update: {
                receipt_id: id,
                item_id: item.item_id ?? null,
                qty: item.qty ?? null,
                unit_price: item.unit_price ?? null,
                total: item.total ?? null,
                category_custom: item.category_custom ?? null,
                tags_custom: item.tags_custom ?? null,
              },
            });
          }
        }
      });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "receipts") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      const existingReceipt = await prisma.receipt.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existingReceipt) {
        return NextResponse.json(
          { error: "receipt", message: "Receipt does not exist" },
          { status: 400 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.receiptItem.deleteMany({ where: { receipt_id: id } });
        await tx.receipt.deleteMany({ where: { id } });
      });

      processed++;
    }

    if (operation.op === "PUT" && operation.table === "receipt_items") {
      const { id, opData } = operation;

      await prisma.receiptItem.upsert({
        where: { id },
        create: {
          id,
          receipt_id: opData?.receipt_id as string,
          item_id: opData?.item_id ?? null,
          qty: opData?.qty ?? null,
          unit_price: opData?.unit_price ?? null,
          total: opData?.total ?? null,
          category_custom: opData?.category_custom ?? null,
          tags_custom: opData?.tags_custom ?? null,
        },
        update: {
          receipt_id: opData?.receipt_id as string,
          item_id: opData?.item_id ?? null,
          qty: opData?.qty ?? null,
          unit_price: opData?.unit_price ?? null,
          total: opData?.total ?? null,
          category_custom: opData?.category_custom ?? null,
          tags_custom: opData?.tags_custom ?? null,
        },
      });

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

      await prisma.receiptItem.updateMany({ where: { id }, data: opData });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "receipt_items") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await prisma.receiptItem.deleteMany({ where: { id } });

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

      await prisma.merchant.upsert({
        where: { id },
        create: {
          id,
          name,
          emoji: opData?.emoji ?? null,
          user_id: userId as string,
          created_at: createdAt,
        },
        update: {
          name,
          emoji: opData?.emoji ?? null,
          user_id: userId as string,
        },
      });

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

      await prisma.merchant.updateMany({ where: { id }, data: opData });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "merchants") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await prisma.merchant.deleteMany({ where: { id } });

      processed++;
    }

    if (operation.op === "PUT" && operation.table === "manifests") {
      const { id, opData } = operation;

      let createdAt = opData?.created_at;
      if (!createdAt) {
        createdAt = new Date().toISOString();
      }

      // Parse items JSON string to JSONB
      const itemsJson = normalizeItemsJson(opData?.items);

      await prisma.manifest.upsert({
        where: { id },
        create: {
          id,
          title: opData?.title ?? null,
          status: opData?.status ?? ManifestStatus.DRAFT,
          merchant_name: opData?.merchant_name ?? null,
          items: itemsJson ?? [],
          user_id: userId as string,
          created_by: opData?.created_by ?? null,
          created_at: createdAt,
          updated_at: createdAt,
        },
        update: {
          title: opData?.title ?? null,
          status: opData?.status ?? ManifestStatus.DRAFT,
          merchant_name: opData?.merchant_name ?? null,
          items: itemsJson ?? [],
          user_id: userId as string,
          updated_at: createdAt,
        },
      });

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "manifests") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      // Guard: Validate title is string or null if provided
      if (opData.title !== undefined && opData.title !== null && typeof opData.title !== "string") {
        return NextResponse.json(
          { error: "title", message: "title must be a string or null" },
          { status: 400 },
        );
      }

      // Guard: Validate status transition if status is being changed
      if (opData.status !== undefined) {
        if (!isValidManifestStatus(opData.status)) {
          return NextResponse.json(
            { error: "status", message: `status must be one of: ${VALID_MANIFEST_STATUSES.join(", ")}` },
            { status: 400 },
          );
        }

        const existing = await prisma.manifest.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!existing) {
          return NextResponse.json(
            { error: "manifest", message: "Manifest does not exist" },
            { status: 400 },
          );
        }

        const currentStatus = existing.status;
        const expectedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus];
        if (!expectedNext || opData.status !== expectedNext) {
          return NextResponse.json(
            {
              error: "status",
              message: `Invalid status transition: cannot go from ${currentStatus} to ${opData.status}`,
            },
            { status: 400 },
          );
        }
      }

      // Parse items JSON string to JSONB if provided
      const updateData: any = { ...opData };
      if (opData.items !== undefined) {
        updateData.items = normalizeItemsJson(opData.items) ?? [];
      }

      const fields = Object.keys(updateData);
      if (fields.length === 0) {
        continue;
      }

      await prisma.manifest.updateMany({ where: { id }, data: updateData });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "manifests") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await prisma.manifest.deleteMany({ where: { id } });

      processed++;
    }

    // Catalog items (manifest_items table) - reshaped to catalog
    if (operation.op === "PUT" && operation.table === "manifest_items") {
      const { id, opData } = operation;

      // Guard: Validate name is non-empty string
      const name = opData?.name;
      if (!isValidName(name)) {
        return NextResponse.json(
          { error: "name", message: "name must be a non-empty string" },
          { status: 400 },
        );
      }

      await prisma.manifestItem.upsert({
        where: { id },
        create: {
          id,
          name,
          category: opData?.category ?? null,
          user_id: userId as string,
          created_at: opData?.created_at ?? new Date().toISOString(),
          updated_at: opData?.updated_at ?? new Date().toISOString(),
        },
        update: {
          name,
          category: opData?.category ?? null,
          user_id: userId as string,
          updated_at: new Date().toISOString(),
        },
      });

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "manifest_items") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      const fields = Object.keys(opData);
      if (fields.length === 0) {
        continue;
      }

      await prisma.manifestItem.updateMany({ where: { id }, data: opData });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "manifest_items") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await prisma.manifestItem.deleteMany({ where: { id } });

      processed++;
    }

    // Merchant aisles
    if (operation.op === "PUT" && operation.table === "merchant_aisles") {
      const { id, opData } = operation;

      // Guard: Validate merchant_id FK
      const merchantId = opData?.merchant_id;
      if (!merchantId) {
        return NextResponse.json(
          { error: "merchant_id", message: "merchant_id is required" },
          { status: 400 },
        );
      }
      if (!(await isValidForeignKey("merchants", merchantId))) {
        return NextResponse.json(
          { error: "merchant_id", message: "merchant_id does not exist" },
          { status: 400 },
        );
      }

      await prisma.merchantAisle.upsert({
        where: { id },
        create: {
          id,
          merchant_id: merchantId,
          category: opData?.category as string,
          sort_order: (opData?.order as number) ?? 0,
          user_id: userId as string,
          created_at: opData?.created_at ?? new Date().toISOString(),
        },
        update: {
          merchant_id: merchantId,
          category: opData?.category as string,
          sort_order: (opData?.order as number) ?? 0,
          user_id: userId as string,
        },
      });

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "merchant_aisles") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      // Remap DB column name 'order' to Prisma field 'sort_order'
      const data: any = { ...opData };
      if (data.order !== undefined) {
        data.sort_order = data.order;
        delete data.order;
      }

      const fields = Object.keys(data);
      if (fields.length === 0) {
        continue;
      }

      await prisma.merchantAisle.updateMany({ where: { id }, data });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "merchant_aisles") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await prisma.merchantAisle.deleteMany({ where: { id } });

      processed++;
    }

    // Merchant item rules
    if (operation.op === "PUT" && operation.table === "merchant_item_rules") {
      const { id, opData } = operation;

      // Guard: Validate merchant_id FK
      const merchantId = opData?.merchant_id;
      if (!merchantId) {
        return NextResponse.json(
          { error: "merchant_id", message: "merchant_id is required" },
          { status: 400 },
        );
      }
      if (!(await isValidForeignKey("merchants", merchantId))) {
        return NextResponse.json(
          { error: "merchant_id", message: "merchant_id does not exist" },
          { status: 400 },
        );
      }

      // Guard: Validate manifest_item_id FK
      const manifestItemId = opData?.manifest_item_id;
      if (!manifestItemId) {
        return NextResponse.json(
          { error: "manifest_item_id", message: "manifest_item_id is required" },
          { status: 400 },
        );
      }
      if (!(await isValidForeignKey("manifest_items", manifestItemId))) {
        return NextResponse.json(
          { error: "manifest_item_id", message: "manifest_item_id does not exist" },
          { status: 400 },
        );
      }

      await prisma.merchantItemRule.upsert({
        where: { id },
        create: {
          id,
          merchant_id: merchantId,
          manifest_item_id: manifestItemId,
          category: opData?.category as string,
          sort_order: (opData?.order as number) ?? 0,
          user_id: userId as string,
          created_at: opData?.created_at ?? new Date().toISOString(),
        },
        update: {
          merchant_id: merchantId,
          manifest_item_id: manifestItemId,
          category: opData?.category as string,
          sort_order: (opData?.order as number) ?? 0,
          user_id: userId as string,
        },
      });

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "merchant_item_rules") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      // Remap DB column name 'order' to Prisma field 'sort_order'
      const data: any = { ...opData };
      if (data.order !== undefined) {
        data.sort_order = data.order;
        delete data.order;
      }

      const fields = Object.keys(data);
      if (fields.length === 0) {
        continue;
      }

      await prisma.merchantItemRule.updateMany({ where: { id }, data });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "merchant_item_rules") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await prisma.merchantItemRule.deleteMany({ where: { id } });

      processed++;
    }

    if (operation.op === "PUT" && operation.table === "manifest_crew") {
      const { id, opData } = operation;

      await prisma.manifestCrew.upsert({
        where: { id },
        create: {
          id,
          manifest_id: opData?.manifest_id as string,
          user_id: opData?.user_id as string,
          role: opData?.role ?? "OPERATOR",
        },
        update: {
          manifest_id: opData?.manifest_id as string,
          user_id: opData?.user_id as string,
          role: opData?.role ?? "OPERATOR",
        },
      });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "manifest_crew") {
      const { id, opData } = operation;

      if (opData?.manifest_id && opData?.user_id) {
        await prisma.manifestCrew.deleteMany({
          where: { manifest_id: opData.manifest_id, user_id: opData.user_id },
        });
      } else if (id) {
        await prisma.manifestCrew.deleteMany({ where: { id } });
      }

      processed++;
    }

    if (operation.op === "PUT" && operation.table === "users") {
      const { id, opData } = operation;

      // Preserve the previous COALESCE semantics: only overwrite fields that
      // are actually provided (non-null); leave existing values otherwise.
      const update: { name?: string; email?: string; callsign?: string } = {};
      if (opData?.name != null) update.name = opData.name;
      if (opData?.email != null) update.email = opData.email;
      if (opData?.callsign != null) update.callsign = opData.callsign;

      await prisma.user.upsert({
        where: { id },
        create: {
          id,
          name: opData?.name ?? "",
          email: opData?.email ?? "",
          callsign: opData?.callsign ?? "",
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        update,
      });

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "users") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      const fields = Object.keys(opData);
      if (fields.length === 0) {
        continue;
      }

      await prisma.user.updateMany({
        where: { id },
        data: remapUserData(opData),
      });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "users") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await prisma.user.deleteMany({ where: { id } });

      processed++;
    }

    if (operation.op === "PUT" && operation.table === "user_crew") {
      const { id, opData } = operation;

      await prisma.userCrew.upsert({
        where: { id },
        create: {
          id,
          user_id_a: opData?.user_id_a as string,
          user_id_b: opData?.user_id_b as string,
          status: opData?.status ?? "pending",
          requested_by: opData?.requested_by as string,
          created_at: opData?.created_at ?? new Date().toISOString(),
          updated_at: opData?.updated_at ?? new Date().toISOString(),
        },
        update: {
          status: opData?.status ?? "pending",
          requested_by: opData?.requested_by as string,
          updated_at: opData?.updated_at ?? new Date().toISOString(),
        },
      });

      processed++;
    }

    if (operation.op === "PATCH" && operation.table === "user_crew") {
      const { id, opData } = operation;

      if (!id) {
        continue;
      }

      const fields = Object.keys(opData);
      if (fields.length === 0) {
        continue;
      }

      await prisma.userCrew.updateMany({ where: { id }, data: opData });

      processed++;
    }

    if (operation.op === "DELETE" && operation.table === "user_crew") {
      const { id } = operation;

      if (!id) {
        continue;
      }

      await prisma.userCrew.deleteMany({ where: { id } });

      processed++;
    }
  }

  return NextResponse.json({ success: true, processed });
}
