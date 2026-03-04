import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../../../lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);
    const { id } = await params;

    const tu = await db.tenantUser.findFirst({
      where: { id, tenantId },
      include: { user: { select: { id: true, image: true } } },
    });
    if (!tu) {
      return NextResponse.json({ message: "Miembro no encontrado" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    if (!file) {
      return NextResponse.json({ message: "No se envió foto" }, { status: 400 });
    }

    if (file.size > 500 * 1024) {
      return NextResponse.json({ message: "La foto no debe superar 500KB" }, { status: 400 });
    }

    // Delete old blob if exists
    if (tu.user.image?.includes("blob.vercel-storage.com")) {
      await del(tu.user.image).catch(() => {});
    }

    const blob = await put(`members/${tu.userId}/${Date.now()}.jpg`, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
    });

    await db.user.update({
      where: { id: tu.userId },
      data: { image: blob.url },
    });

    return NextResponse.json({ data: { image: blob.url } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al subir foto" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);
    const { id } = await params;

    const tu = await db.tenantUser.findFirst({
      where: { id, tenantId },
      include: { user: { select: { id: true, image: true } } },
    });
    if (!tu) {
      return NextResponse.json({ message: "Miembro no encontrado" }, { status: 404 });
    }

    if (tu.user.image?.includes("blob.vercel-storage.com")) {
      await del(tu.user.image).catch(() => {});
    }

    await db.user.update({
      where: { id: tu.userId },
      data: { image: null },
    });

    return NextResponse.json({ data: { image: null } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al eliminar foto" }, { status: 500 });
  }
}
