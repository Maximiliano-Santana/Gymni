import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../../../lib/validation";
import path from "path";
import fs from "fs/promises";

const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

// ── Storage helpers ──

async function uploadFile(
  filePath: string,
  file: File
): Promise<string> {
  if (useVercelBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(filePath, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
    });
    return blob.url;
  }

  // Local filesystem: save to public/uploads/
  const ext = file.type === "image/png" ? ".png" : ".jpg";
  const localPath = `uploads/${filePath}${ext}`;
  const fullPath = path.join(process.cwd(), "public", localPath);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buffer);

  return `/${localPath}`;
}

async function deleteFile(url: string): Promise<void> {
  if (url.includes("blob.vercel-storage.com")) {
    const { del } = await import("@vercel/blob");
    await del(url).catch(() => {});
  } else if (url.startsWith("/uploads/")) {
    const fullPath = path.join(process.cwd(), "public", url);
    await fs.unlink(fullPath).catch(() => {});
  }
}

// ── Routes ──

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

    // Delete old photo
    if (tu.user.image) {
      await deleteFile(tu.user.image);
    }

    const url = await uploadFile(
      `members/${tu.userId}/${Date.now()}`,
      file
    );

    await db.user.update({
      where: { id: tu.userId },
      data: { image: url },
    });

    return NextResponse.json({ data: { image: url } });
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

    if (tu.user.image) {
      await deleteFile(tu.user.image);
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
