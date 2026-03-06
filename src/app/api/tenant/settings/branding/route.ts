import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../../lib/validation";
import path from "path";
import fs from "fs/promises";

const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

async function uploadFile(filePath: string, file: File): Promise<string> {
  if (useVercelBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(filePath, file, {
      access: "public",
      contentType: file.type || "image/png",
    });
    return blob.url;
  }

  const ext = file.type === "image/png" ? ".png" : file.type === "image/svg+xml" ? ".svg" : ".jpg";
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

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ message: "No se envió archivo" }, { status: 400 });
    }
    if (!type || !["logo", "favicon"].includes(type)) {
      return NextResponse.json({ message: "Tipo inválido" }, { status: 400 });
    }
    if (file.size > 500 * 1024) {
      return NextResponse.json({ message: "El archivo no debe superar 500KB" }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ message: "Tenant no encontrado" }, { status: 404 });
    }

    const currentSettings = (tenant.settings as Record<string, unknown>) ?? {};
    const currentAssets = (currentSettings.assets as Record<string, unknown>) ?? {};

    // Delete old file if exists
    if (type === "logo") {
      const oldLogo = currentAssets.logo as { light?: string; dark?: string } | undefined;
      if (oldLogo?.light) await deleteFile(oldLogo.light);
      if (oldLogo?.dark) await deleteFile(oldLogo.dark);
    } else {
      const oldFavicon = currentAssets.favicon as string | undefined;
      if (oldFavicon) await deleteFile(oldFavicon);
    }

    const url = await uploadFile(
      `tenants/${tenantId}/${type}/${Date.now()}`,
      file
    );

    const newAssets =
      type === "logo"
        ? { ...currentAssets, logo: { light: url } }
        : { ...currentAssets, favicon: url };

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        settings: { ...currentSettings, assets: newAssets } as any,
      },
    });

    return NextResponse.json({ data: { url } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al subir archivo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);

    const body = await request.json().catch(() => ({}));
    const type = body.type as string | undefined;

    if (!type || !["logo", "favicon"].includes(type)) {
      return NextResponse.json({ message: "Tipo inválido" }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ message: "Tenant no encontrado" }, { status: 404 });
    }

    const currentSettings = (tenant.settings as Record<string, unknown>) ?? {};
    const currentAssets = (currentSettings.assets as Record<string, unknown>) ?? {};

    if (type === "logo") {
      const oldLogo = currentAssets.logo as { light?: string; dark?: string } | undefined;
      if (oldLogo?.light) await deleteFile(oldLogo.light);
      if (oldLogo?.dark) await deleteFile(oldLogo.dark);
      delete currentAssets.logo;
    } else {
      const oldFavicon = currentAssets.favicon as string | undefined;
      if (oldFavicon) await deleteFile(oldFavicon);
      delete currentAssets.favicon;
    }

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        settings: { ...currentSettings, assets: currentAssets } as any,
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al eliminar archivo" }, { status: 500 });
  }
}
