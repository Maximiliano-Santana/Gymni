-- DropForeignKey
ALTER TABLE "public"."check_ins" DROP CONSTRAINT "check_ins_tenantUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."member_invoices" DROP CONSTRAINT "member_invoices_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."member_payments" DROP CONSTRAINT "member_payments_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."member_subscriptions" DROP CONSTRAINT "member_subscriptions_tenantUserId_fkey";

-- AddForeignKey
ALTER TABLE "public"."member_subscriptions" ADD CONSTRAINT "member_subscriptions_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "public"."TenantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_invoices" ADD CONSTRAINT "member_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."member_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."member_payments" ADD CONSTRAINT "member_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."member_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."check_ins" ADD CONSTRAINT "check_ins_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "public"."TenantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
