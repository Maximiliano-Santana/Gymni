/*
  Warnings:

  - You are about to drop the `MembershipPlan` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."MemberSubStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');

-- DropTable
DROP TABLE "public"."MembershipPlan";

-- CreateTable
CREATE TABLE "public"."membership_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "limits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."membership_prices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "interval" "public"."BillingInterval" NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "providerPriceId" TEXT,
    "providerProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."member_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantUserId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "status" "public"."MemberSubStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingEndsAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "providerSubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."member_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'open',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "planId" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."member_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "receivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_plans_tenantId_isActive_idx" ON "public"."membership_plans"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_tenantId_code_key" ON "public"."membership_plans"("tenantId", "code");

-- CreateIndex
CREATE INDEX "membership_prices_planId_interval_isActive_idx" ON "public"."membership_prices"("planId", "interval", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "member_subscriptions_providerSubId_key" ON "public"."member_subscriptions"("providerSubId");

-- CreateIndex
CREATE INDEX "member_subscriptions_tenantId_status_idx" ON "public"."member_subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "member_subscriptions_tenantUserId_idx" ON "public"."member_subscriptions"("tenantUserId");

-- CreateIndex
CREATE INDEX "member_invoices_tenantId_status_idx" ON "public"."member_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "member_invoices_subscriptionId_idx" ON "public"."member_invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "member_payments_tenantId_paidAt_idx" ON "public"."member_payments"("tenantId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "member_payments_invoiceId_reference_key" ON "public"."member_payments"("invoiceId", "reference");

-- AddForeignKey
ALTER TABLE "public"."membership_plans" ADD CONSTRAINT "membership_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."membership_prices" ADD CONSTRAINT "membership_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_subscriptions" ADD CONSTRAINT "member_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_subscriptions" ADD CONSTRAINT "member_subscriptions_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "public"."TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_subscriptions" ADD CONSTRAINT "member_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_subscriptions" ADD CONSTRAINT "member_subscriptions_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "public"."membership_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_invoices" ADD CONSTRAINT "member_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_invoices" ADD CONSTRAINT "member_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."member_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_payments" ADD CONSTRAINT "member_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_payments" ADD CONSTRAINT "member_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."member_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
