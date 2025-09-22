/*
  Warnings:

  - You are about to drop the column `role` on the `TenantUser` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."TenantUser" DROP COLUMN "role",
ADD COLUMN     "roles" "public"."TenantRole"[] DEFAULT ARRAY[]::"public"."TenantRole"[];
