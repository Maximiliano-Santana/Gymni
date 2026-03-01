import type { TenantSettings } from "../types/settings";

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  version: "1.0.0",
  mode: "light",

  metadata: {
    name: "Gym&i",
    description: "App de gym impulsada por Gym&i",
  },

  colors: {
    primary: "#e86c00",
    grayBase: "#545454",
    success: "#2db224",
    warning: "#eb7b7b",
  },

  layout: {
    borderRadius: { base: "0.5rem" },
  },

  assets: {
    favicon: "./dev-gym.svg",
  },
};
