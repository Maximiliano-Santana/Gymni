import type { ThemeManifest } from "../types/theme";

export const DEFAULT_THEME_MANIFEST: ThemeManifest = {
  version: "1.0.0",
  metadata: {
    name: "Default Gym Theme",
    description: "Theme por defecto basado en tu CSS global",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  colors: {
    // Colores que coinciden con tu CSS actual
    primary: "#5e08b4",      // Tu primary actual
    secondary: "#ac59ff",    // Tu secondary actual  
    accent: "#8040c0",       // Para variantes
    
    success: "#2db224",      // Tu success actual
    warning: "#eb7b7b",      // Tu danger actual
    
    background: {
      primary: "#ffffff",    // --background
      secondary: "#545454",  // Base para generar grays
      card: "#ffffff",       // --card
    },
    
    text: {
      primary: "#000000",    // --foreground  
      secondary: "#5f5f5f",  // --gray-700 aproximado
      muted: "#9e9e9e",      // --gray-500 aproximado
    },
    
    border: {
      default: "#545454",    // Tu --gray actual
      focus: "#ac9ff0",      // Tu --primary-focus actual
    },
  },
  
  // typography: {
  //   fontFamily: {
  //     primary: "Inter, system-ui, sans-serif",
  //   },
  // },
  
  layout: {
    borderRadius: {
      base: "0.5rem",        // Tu --radius actual
      // sm, lg, full se calculan automáticamente
    },
  },
  
  assets: {},
};

