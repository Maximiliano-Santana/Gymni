import { DEFAULT_THEME_MANIFEST } from "../lib/default-theme";
import { ThemeManifest } from "../types/theme";

/**
 * Genera CSS completo basado en tu estructura global actual
 */
export function generateTenantCSS(theme: ThemeManifest | null): string {

  // Se mergean manifests para tener fallbacks
  const manifest = {
    ...DEFAULT_THEME_MANIFEST,
    ...theme,
    colors: { ...DEFAULT_THEME_MANIFEST.colors, ...theme?.colors },
    layout: { ...DEFAULT_THEME_MANIFEST.layout, ...theme?.layout },
  };

  // Calcular colores derivados automáticamente
  const primaryColors = generateColorVariants(manifest.colors.primary);
  const secondaryColors = generateColorVariants(manifest.colors.secondary);
  const grayColors = generateGrayScale(manifest.colors.background.secondary);

  return `
:root {
  --white: #ffffff;
  --black: #000000;

  /* Primary colors - Dinámicos desde manifest */
  --primary: ${manifest.colors.primary};
  --primary-l: ${primaryColors.light};
  --primary-d: ${primaryColors.dark};
  --primary-hover: ${primaryColors.hover};
  --primary-focus: ${primaryColors.focus};
  --primary-border: ${primaryColors.border};
  --primary-secondary: ${primaryColors.secondary};

  /* Secondary colors - Dinámicos desde manifest */
  --secondary: ${manifest.colors.secondary};
  --secondary-l: ${secondaryColors.light};
  --secondary-d: ${secondaryColors.dark};

  /* Gray scale - Generada automáticamente */
  --gray: ${grayColors.base};
  --gray-100: ${grayColors.g100};
  --gray-200: ${grayColors.g200};
  --gray-300: ${grayColors.g300};
  --gray-400: ${grayColors.g400};
  --gray-500: ${grayColors.g500};
  --gray-600: ${grayColors.g600};
  --gray-700: ${grayColors.g700};
  --gray-800: ${grayColors.g800};
  --gray-900: ${grayColors.g900};

  /* Status colors - Desde manifest */
  --danger: ${manifest.colors.warning};
  --success: ${manifest.colors.success};

  /* Layout - Desde manifest */
  --radius: ${manifest.layout.borderRadius.base};
  
  /* Base colors - Desde manifest */
  --background: ${manifest.colors.background.primary};
  --foreground: ${manifest.colors.text.primary};
  --card: ${manifest.colors.background.card};
  --card-foreground: ${manifest.colors.text.primary};
  --popover: ${grayColors.g100};
  --popover-foreground: ${grayColors.g900};
  
  /* Semantic colors */
  --primary-foreground: ${getContrastColor(manifest.colors.primary)};
  --secondary-foreground: ${manifest.colors.primary};
  --muted: ${grayColors.g500};
  --muted-foreground: ${grayColors.g200};
  --accent: ${primaryColors.secondary};
  --accent-foreground: ${manifest.colors.primary};
  --destructive: ${manifest.colors.warning};
  --border: ${grayColors.base};
  --input: ${manifest.colors.border.focus};
  --ring: ${primaryColors.focus};
  
  /* Chart colors - Mantener por compatibilidad */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  
  /* Sidebar colors */
  --sidebar: ${grayColors.g100};
  --sidebar-foreground: ${grayColors.g900};
  --sidebar-primary: ${manifest.colors.primary};
  --sidebar-primary-foreground: ${getContrastColor(manifest.colors.primary)};
  --sidebar-accent: ${primaryColors.hover};
  --sidebar-accent-foreground: ${getContrastColor(primaryColors.hover)};
  --sidebar-border: ${primaryColors.border};
  --sidebar-ring: ${primaryColors.focus};
}
`;
}

/**
 * Genera variantes de color automáticamente
 */
function generateColorVariants(baseColor: string) {
  // Simulación de variantes - en producción usar librerías como color2k
  const variants = {
    light: lightenColor(baseColor, 20),
    dark: darkenColor(baseColor, 20),
    hover: adjustColor(baseColor, { saturation: 10, lightness: -5 }),
    focus: adjustColor(baseColor, { alpha: 0.3 }),
    border: adjustColor(baseColor, { lightness: 30, saturation: -20 }),
    secondary: adjustColor(baseColor, { lightness: 45, saturation: -30 }),
  };

  return variants;
}

/**
 * Genera escala de grises basada en un color base
 */
function generateGrayScale(baseGray: string) {
  return {
    base: "#dee3e7",
    g100: lightenColor(baseGray, 40),
    g200: lightenColor(baseGray, 30),
    g300: lightenColor(baseGray, 20),
    g400: lightenColor(baseGray, 10),
    g500: baseGray,
    g600: darkenColor(baseGray, 10),
    g700: darkenColor(baseGray, 20),
    g800: darkenColor(baseGray, 30),
    g900: darkenColor(baseGray, 40),
  };
}

/**
 * Determina color de contraste (blanco o negro)
 */
function getContrastColor(bgColor: string): string {
  // Algoritmo simplificado - en producción usar contrast ratio real
  const isLight = isColorLight(bgColor);
  return isLight ? "#000000" : "#ffffff";
}

/**
 * Utilitarias de color (simplificadas)
 * En producción, usar librerías como color2k, chroma-js, etc.
 */
function lightenColor(color: string, amount: number): string {
  // Implementación simplificada
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const num = parseInt(hex, 16);
    let r = (num >> 16) + Math.round((255 * amount) / 100);
    let g = ((num >> 8) & 0x00ff) + Math.round((255 * amount) / 100);
    let b = (num & 0x0000ff) + Math.round((255 * amount) / 100);

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }
  return color;
}

function darkenColor(color: string, amount: number): string {
  return lightenColor(color, -amount);
}

function adjustColor(
  color: string,
  adjustments: {
    saturation?: number;
    lightness?: number;
    alpha?: number;
  }
): string {
  // Implementación simplificada para demo
  // En producción, usar librerías especializadas
  if (adjustments.alpha !== undefined) {
    const opacity = Math.round(adjustments.alpha * 255)
      .toString(16)
      .padStart(2, "0");
    return color + opacity;
  }

  if (adjustments.lightness) {
    return adjustments.lightness > 0
      ? lightenColor(color, adjustments.lightness)
      : darkenColor(color, Math.abs(adjustments.lightness));
  }

  return color;
}

function isColorLight(color: string): boolean {
  // Algoritmo simplificado de luminancia
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;

    // Fórmula de luminancia percibida
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }
  return false;
}

/**
 * Genera ETag para cache
 */
export function generateETag(tenantId: string, updatedAt: Date | null): string {
  const timestamp = updatedAt?.getTime() || 0;
  return `"theme-${tenantId}-${timestamp}"`;
}

/**
 * CSS por defecto para desarrollo/público
 */
export function getDefaultCSS(): string {
  return generateTenantCSS(null);
}
