/*
  Warnings:

  - You are about to drop the column `token` on the `invitations` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."invitations_token_key";

-- AlterTable
ALTER TABLE "public"."invitations" DROP COLUMN "token";
