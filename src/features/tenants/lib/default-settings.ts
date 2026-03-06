import type { TenantSettings } from "../types/settings";

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  version: "1.0.0",
  mode: "dark",

  metadata: {
    name: "Gym&i",
    description: "App de gym impulsada por Gym&i",
  },

  colors: {
    primary: "#7c3aed",
    secondary: "#a78bfa",
    grayBase: "#5c4a7c",
    success: "#22c55e",
    warning: "#f87171",
  },

  layout: {
    borderRadius: { base: "0.5rem" },
  },

  assets: {
    favicon: "./dev-gym.svg",
  },

  billing: {
    graceDays: 0,
    autoCancelDays: 0,
  },

  timezone: "America/Mexico_City",
};
