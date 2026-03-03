import { DEFAULT_TENANT_SETTINGS } from "../lib/default-settings";
import { TenantSettings } from "../types/settings";

/**
 * Genera CSS completo a partir del TenantSettings.
 * Solo requiere `primary` + `mode` — todo lo demás se deriva automáticamente.
 */
export function generateTenantCSS(theme: TenantSettings | null): string {
  const mode = theme?.mode ?? DEFAULT_TENANT_SETTINGS.mode;
  const isDark = mode === "dark";

  // Resolver colores con fallbacks en cascada
  const primary   = theme?.colors?.primary   ?? DEFAULT_TENANT_SETTINGS.colors.primary;
  const grayBase  = theme?.colors?.grayBase  ?? DEFAULT_TENANT_SETTINGS.colors.grayBase ?? "#545454";
  const success   = theme?.colors?.success   ?? DEFAULT_TENANT_SETTINGS.colors.success  ?? "#2db224";
  const warning   = theme?.colors?.warning   ?? DEFAULT_TENANT_SETTINGS.colors.warning  ?? "#eb7b7b";

  // secondary: usar el definido o derivar del primary
  const secondary = theme?.colors?.secondary
    ?? DEFAULT_TENANT_SETTINGS.colors.secondary
    ?? deriveSecondary(primary);

  const radius = theme?.layout?.borderRadius?.base
    ?? DEFAULT_TENANT_SETTINGS.layout.borderRadius.base;

  // Generar escalas de color
  const grayColors  = generateGrayScale(grayBase);
  const chartColors = generateChartColors(primary);

  // Derivar superficies según mode + escala de grises
  const background  = isDark ? grayColors.g900 : "#ffffff";
  const card        = isDark ? grayColors.g800 : "#ffffff";
  const textPrimary = isDark ? grayColors.g100 : grayColors.g900;
  const inputBorder = adjustColor(primary, { alpha: 0.4 });
  const focusRing   = adjustColor(primary, { alpha: 0.3 });

  return `
:root {
  --white: #ffffff;
  --black: #000000;

  /* Primary */
  --primary: ${primary};

  /* Secondary */
  --secondary: ${secondary};

  /* Gray scale — generada y normalizada desde grayBase */
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

  /* Status */
  --danger: ${warning};
  --success: ${success};

  /* Layout */
  --radius: ${radius};

  /* Superficies — derivadas de mode + gray scale */
  --background: ${background};
  --foreground: ${textPrimary};
  --card: ${card};
  --card-foreground: ${textPrimary};
  --popover: ${isDark ? grayColors.g800 : grayColors.g100};
  --popover-foreground: ${isDark ? grayColors.g100 : grayColors.g900};

  /* Semánticos */
  --primary-foreground: ${getContrastColor(primary)};
  --secondary-foreground: ${getContrastColor(secondary)};
  --muted: ${isDark ? grayColors.g700 : grayColors.g200};
  --muted-foreground: ${isDark ? grayColors.g300 : grayColors.g600};
  --accent: ${isDark ? adjustColor(primary, { alpha: 0.25 }) : lightenColor(primary, 40)};
  --accent-foreground: ${textPrimary};
  --destructive: ${warning};
  --border: ${grayColors.base};
  --input: ${inputBorder};
  --ring: ${focusRing};

  /* Charts — derivados del primary */
  --chart-1: ${chartColors.c1};
  --chart-2: ${chartColors.c2};
  --chart-3: ${chartColors.c3};
  --chart-4: ${chartColors.c4};
  --chart-5: ${chartColors.c5};

  /* Sidebar */
  --sidebar: ${isDark ? grayColors.g800 : grayColors.g100};
  --sidebar-foreground: ${isDark ? grayColors.g100 : grayColors.g900};
  --sidebar-primary: ${primary};
  --sidebar-primary-foreground: ${getContrastColor(primary)};
  --sidebar-accent: ${lightenColor(primary, 20)};
  --sidebar-accent-foreground: ${darkenColor(primary, 20)};
  --sidebar-border: ${grayColors.base};
  --sidebar-ring: ${focusRing};
}
`;
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

/** Convierte hex a HSL. Retorna h: 0–360, s: 0–100, l: 0–100 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  if (!hex.startsWith("#") || hex.length < 7) return { h: 0, s: 0, l: 50 };

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** Convierte HSL a hex */
function hslToHex(h: number, s: number, l: number): string {
  const lN = l / 100;
  const sN = s / 100;
  const a = sN * Math.min(lN, 1 - lN);

  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lN - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Aclara un color ajustando la luminosidad en HSL */
function lightenColor(color: string, amount: number): string {
  const { h, s, l } = hexToHsl(color);
  return hslToHex(h, s, Math.min(l + amount, 100));
}

/** Oscurece un color ajustando la luminosidad en HSL */
function darkenColor(color: string, amount: number): string {
  const { h, s, l } = hexToHsl(color);
  return hslToHex(h, s, Math.max(l - amount, 0));
}

/** Agrega canal alpha a un color hex */
function adjustColor(color: string, { alpha }: { alpha: number }): string {
  const opacity = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return color + opacity;
}

/**
 * Genera escala de grises desde un color base.
 * Normaliza el input: conserva el matiz (hue) pero fuerza saturación baja (≤12%)
 * para garantizar que cualquier color se convierta en un gris tintado.
 */
function generateGrayScale(baseGray: string) {
  const { h, s, l } = hexToHsl(baseGray);

  // Desaturar (máx 12%) y centrar la luminosidad en rango mid (35–65%)
  const normalizedBase = hslToHex(
    h,
    Math.min(s, 12),
    Math.min(Math.max(l, 35), 65)
  );

  return {
    base: normalizedBase,
    g100: lightenColor(normalizedBase, 40),
    g200: lightenColor(normalizedBase, 30),
    g300: lightenColor(normalizedBase, 20),
    g400: lightenColor(normalizedBase, 10),
    g500: normalizedBase,
    g600: darkenColor(normalizedBase, 10),
    g700: darkenColor(normalizedBase, 20),
    g800: darkenColor(normalizedBase, 30),
    g900: darkenColor(normalizedBase, 40),
  };
}

/**
 * Genera 5 colores para charts derivados del primary.
 * Distribuye los hues para máxima diferenciación visual,
 * manteniendo saturación y luminosidad en rangos legibles.
 */
function generateChartColors(primary: string) {
  const { h, s } = hexToHsl(primary);
  const sat = Math.min(Math.max(s, 50), 85);

  return {
    c1: hslToHex(h,                    sat,       50),  // primary puro (normalizado)
    c2: hslToHex((h + 150) % 360,      sat - 10,  45),  // complementario
    c3: hslToHex((h + 210) % 360,      sat - 20,  35),  // triádico oscuro
    c4: hslToHex((h + 60)  % 360,      sat,       65),  // análogo cálido claro
    c5: hslToHex((h + 270) % 360,      sat - 5,   55),  // split-complementario
  };
}

/** Deriva un secondary razonable desde el primary (más claro, menos saturado) */
function deriveSecondary(primary: string): string {
  const { h, s, l } = hexToHsl(primary);
  return hslToHex(h, Math.max(s - 15, 40), Math.min(l + 20, 80));
}

/** Retorna blanco o negro según la luminancia percibida del fondo */
function getContrastColor(bgColor: string): string {
  if (bgColor.startsWith("#") && bgColor.length >= 7) {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }
  return "#ffffff";
}

/** Genera ETag para cache basado en tenant */
export function generateETag(tenantId: string, updatedAt: Date | null): string {
  const timestamp = updatedAt?.getTime() ?? 0;
  return `"theme-${tenantId}-${timestamp}"`;
}

/** CSS por defecto para desarrollo / landing */
export function getDefaultCSS(): string {
  return generateTenantCSS(null);
}
