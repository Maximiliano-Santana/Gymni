/*
  Warnings:

  - You are about to drop the column `notes` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `interval` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `priceCents` on the `plans` table. All the data in the column will be lost.
  - Added the required column `planId` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceId` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billingInterval` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "public"."invoices" DROP COLUMN "notes",
ADD COLUMN     "planId" TEXT NOT NULL,
ADD COLUMN     "priceId" TEXT NOT NULL,
ALTER COLUMN "currency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."plans" DROP COLUMN "interval",
DROP COLUMN "priceCents";

-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN     "billingInterval" "public"."BillingInterval" NOT NULL,
ADD COLUMN     "priceId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."plan_prices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "interval" "public"."BillingInterval" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "providerVariantId" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_prices_planId_interval_currency_idx" ON "public"."plan_prices"("planId", "interval", "currency");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_status_idx" ON "public"."subscriptions"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "public"."plan_prices" ADD CONSTRAINT "plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "public"."plan_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
