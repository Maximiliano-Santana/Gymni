/*
  Warnings:

  - The values [trialing,past_due] on the enum `SubStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."SubStatus_new" AS ENUM ('active', 'canceled');
ALTER TABLE "public"."subscriptions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."subscriptions" ALTER COLUMN "status" TYPE "public"."SubStatus_new" USING ("status"::text::"public"."SubStatus_new");
ALTER TYPE "public"."SubStatus" RENAME TO "SubStatus_old";
ALTER TYPE "public"."SubStatus_new" RENAME TO "SubStatus";
DROP TYPE "public"."SubStatus_old";
ALTER TABLE "public"."subscriptions" ALTER COLUMN "status" SET DEFAULT 'active';
COMMIT;

-- AlterTable
ALTER TABLE "public"."subscriptions" ALTER COLUMN "status" SET DEFAULT 'active';
