-- CreateEnum
CREATE TYPE "public"."SystemRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- AlterEnum
ALTER TYPE "public"."TenantRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "systemRole" "public"."SystemRole" NOT NULL DEFAULT 'USER';
