/*
  Warnings:

  - You are about to alter the column `last_price` on the `items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `lowest_price` on the `items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `prev_price` on the `manifest_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `est_total` on the `manifests` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `price` on the `price_history` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `unit_price` on the `receipt_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `total` on the `receipt_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `total` on the `receipts` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `savings` on the `receipts` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "items" ALTER COLUMN "last_price" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "lowest_price" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "manifest_items" ALTER COLUMN "prev_price" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "manifests" ALTER COLUMN "est_total" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "price_history" ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "receipt_items" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "receipts" ALTER COLUMN "total" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "savings" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "processing_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scope_entity" TEXT,
    "scope_id" TEXT,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_rules_pkey" PRIMARY KEY ("id")
);
