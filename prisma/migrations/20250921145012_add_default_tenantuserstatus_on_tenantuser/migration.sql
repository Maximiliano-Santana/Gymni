/*
  Warnings:

  - The `status` column on the `TenantUser` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."TenantUser" DROP COLUMN "status",
ADD COLUMN     "status" "public"."TenantUserStatus" NOT NULL DEFAULT 'ACTIVE';
