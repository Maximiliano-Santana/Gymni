import type { Tenant } from "@prisma/client";

/** Tenant with settings typed instead of Prisma's JsonValue. */
export type TenantTyped = Omit<Tenant, "settings"> & { settings: TenantSettings | null };

export function getTenantSettings(tenant: { settings: unknown }): TenantSettings | null {
  return (tenant.settings as TenantSettings) ?? null;
}

export interface TenantSettings {
  version: string;
  mode: "light" | "dark";

  metadata: {
    name: string;
    description?: string;
  };

  colors: {
    /** Color de marca principal. Todo el sistema de color deriva de aquí. */
    primary: string;

    /** Color de marca secundario. Si no se define, se deriva del primary. */
    secondary?: string;

    /**
     * Color base para la escala de grises.
     * Acepta cualquier color — el sistema lo desatura automáticamente
     * para garantizar que siempre sea un gris (frío, cálido o neutro).
     */
    grayBase?: string;

    /** Color de éxito. Default: verde. */
    success?: string;

    /** Color de advertencia/peligro. Default: rojo. */
    warning?: string;
  };

  layout: {
    borderRadius: {
      base: string;
    };
  };

  assets: {
    logo?: {
      light: string;
      dark?: string;
    };
    favicon?: string;
  };
}
