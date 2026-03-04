/*
  Warnings:

  - A unique constraint covering the columns `[qrToken]` on the table `TenantUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."TenantUser" ADD COLUMN     "qrToken" TEXT;

-- CreateTable
CREATE TABLE "public"."check_ins" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantUserId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInBy" TEXT,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_ins_tenantId_checkedInAt_idx" ON "public"."check_ins"("tenantId", "checkedInAt");

-- CreateIndex
CREATE INDEX "check_ins_tenantUserId_checkedInAt_idx" ON "public"."check_ins"("tenantUserId", "checkedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_qrToken_key" ON "public"."TenantUser"("qrToken");

-- AddForeignKey
ALTER TABLE "public"."check_ins" ADD CONSTRAINT "check_ins_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."check_ins" ADD CONSTRAINT "check_ins_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "public"."TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
