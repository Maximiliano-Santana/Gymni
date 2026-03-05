import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import { headers } from "next/headers";
import db from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Ensures the authenticated user has a TenantUser for the current tenant.
 * Called from LoginForm after Google OAuth (where the callback processes on
 * the root domain without tenant context, so TenantUser can't be created
 * during the auth flow itself).
 */
export async function POST() {
  const [session, h] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const subdomain = h.get("x-tenant-subdomain");
  if (!subdomain) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({ where: { subdomain } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const email = session.user.email;

  const existing = await db.tenantUser.findUnique({
    where: { userId_tenantId: { userId, tenantId: tenant.id } },
  });

  if (existing) {
    return NextResponse.json({ status: "already_member" });
  }

  // Check for pending invitation
  const invitation = email
    ? await db.invitation.findFirst({
        where: {
          email,
          tenantId: tenant.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      })
    : null;

  const role = invitation?.role ?? "MEMBER";

  await db.tenantUser.create({
    data: { userId, tenantId: tenant.id, roles: [role] },
  });

  if (invitation) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });
  }

  return NextResponse.json({ status: "created", role });
}
