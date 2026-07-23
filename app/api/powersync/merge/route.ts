import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Merge merchant B into merchant A (primary).
 *
 * Per the design in .plans/001_idea_manifests_rework.md:
 * - receipts.merchant_id      — repoint B → A
 * - price_history.merchant_id — repoint B → A
 * - items.freq_source_id      — repoint B → A
 * - merchant_aisles           — A's rows win on duplicate category; B's unique ones appended
 * - merchant_item_rules       — A's rows win on duplicate (merchant_id, manifest_item_id); B's unique ones appended
 * - manifests.merchant_name   — rewrite B's name → A's name (best-effort, scoped to owner)
 * - merchants (B's row)       — hard delete
 */
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

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { primaryId, secondaryId } = body;

  if (!primaryId || !secondaryId) {
    return NextResponse.json(
      { error: "primaryId and secondaryId are required" },
      { status: 400 },
    );
  }

  if (primaryId === secondaryId) {
    return NextResponse.json(
      { error: "Cannot merge a merchant into itself" },
      { status: 400 },
    );
  }

  // Verify both merchants exist and belong to user
  const [primary, secondary] = await Promise.all([
    prisma.merchant.findUnique({ where: { id: primaryId }, select: { id: true, name: true, user_id: true } }),
    prisma.merchant.findUnique({ where: { id: secondaryId }, select: { id: true, name: true, user_id: true } }),
  ]);

  if (!primary || !secondary) {
    return NextResponse.json(
      { error: "One or both merchants not found" },
      { status: 404 },
    );
  }

  if (primary.user_id !== userId || secondary.user_id !== userId) {
    return NextResponse.json(
      { error: "Merchants must belong to the current user" },
      { status: 403 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Repoint receipts
      await tx.receipt.updateMany({
        where: { merchant_id: secondaryId },
        data: { merchant_id: primaryId },
      });

      // 2. Repoint price_history
      await tx.priceHistory.updateMany({
        where: { merchant_id: secondaryId },
        data: { merchant_id: primaryId },
      });

      // 3. Repoint items.freq_source_id
      await tx.item.updateMany({
        where: { freq_source_id: secondaryId },
        data: { freq_source_id: primaryId },
      });

      // 4. Merge merchant_aisles
      const secondaryAisles = await tx.merchantAisle.findMany({
        where: { merchant_id: secondaryId },
        orderBy: { sort_order: "asc" },
      });

      const primaryAisleCategories = new Set(
        (
          await tx.merchantAisle.findMany({
            where: { merchant_id: primaryId },
            select: { category: true },
          })
        ).map((a) => a.category.trim().toLowerCase()),
      );

      // Get max order of primary's aisles
      const maxOrderResult = await tx.merchantAisle.aggregate({
        where: { merchant_id: primaryId },
        _max: { sort_order: true },
      });
      let nextOrder = (maxOrderResult._max.sort_order ?? 0) + 1;

      for (const aisle of secondaryAisles) {
        const normalizedCategory = aisle.category.trim().toLowerCase();
        if (primaryAisleCategories.has(normalizedCategory)) {
          // A's row wins — drop B's duplicate
          await tx.merchantAisle.delete({ where: { id: aisle.id } });
        } else {
          // Append B's aisle to A with new order
          await tx.merchantAisle.update({
            where: { id: aisle.id },
            data: { merchant_id: primaryId, sort_order: nextOrder++ },
          });
          primaryAisleCategories.add(normalizedCategory); // prevent further duplicates from B
        }
      }

      // 5. Merge merchant_item_rules
      const secondaryRules = await tx.merchantItemRule.findMany({
        where: { merchant_id: secondaryId },
        orderBy: { sort_order: "asc" },
      });

      const primaryRuleKeys = new Set(
        (
          await tx.merchantItemRule.findMany({
            where: { merchant_id: primaryId },
            select: { manifest_item_id: true },
          })
        ).map((r) => r.manifest_item_id),
      );

      const maxRuleOrderResult = await tx.merchantItemRule.aggregate({
        where: { merchant_id: primaryId },
        _max: { sort_order: true },
      });
      let nextRuleOrder = (maxRuleOrderResult._max.sort_order ?? 0) + 1;

      for (const rule of secondaryRules) {
        if (primaryRuleKeys.has(rule.manifest_item_id)) {
          // A's rule wins — drop B's duplicate
          await tx.merchantItemRule.delete({ where: { id: rule.id } });
        } else {
          // Append B's rule to A with new order
          await tx.merchantItemRule.update({
            where: { id: rule.id },
            data: { merchant_id: primaryId, sort_order: nextRuleOrder++ },
          });
          primaryRuleKeys.add(rule.manifest_item_id);
        }
      }

      // 6. Rewrite manifests.merchant_name B → A
      await tx.manifest.updateMany({
        where: { merchant_name: secondary.name, user_id: userId },
        data: { merchant_name: primary.name },
      });

      // 7. Hard delete B
      await tx.merchant.delete({ where: { id: secondaryId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Merge failed:", error);
    return NextResponse.json(
      { error: "Merge failed", details: String(error) },
      { status: 500 },
    );
  }
}
