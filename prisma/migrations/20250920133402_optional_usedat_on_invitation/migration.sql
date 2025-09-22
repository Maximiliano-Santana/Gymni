-- AlterTable
ALTER TABLE "public"."invitations" ALTER COLUMN "usedAt" DROP NOT NULL,
ALTER COLUMN "usedAt" DROP DEFAULT;
