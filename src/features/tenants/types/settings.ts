export interface TenantSettings {
  version: string;
  mode: "light" | "dark";
  metadata: {
    name: string;
    description?: string;
  };
  
  colors: {
    // Colores principales
    primary: string;      // --primary
    secondary: string;    // --secondary
    accent: string;       // Para variantes
    
    // Status colors
    success: string;      // --success  
    warning: string;      // --danger (tu CSS usa 'danger' para warnings)
    
    background: {
      primary: string;    // --background
      secondary: string;  // Base para escala de grises
      card: string;       // --card
    };
    
    text: {
      primary: string;    // --foreground
      secondary: string;  // Texto secundario
      muted: string;      // --muted-foreground base
    };
    
    border: {
      default: string;    // --border base
      focus: string;      // Para rings/focus
    };
  };
  
  // typography: {
  //   fontFamily: {
  //     primary: string;
  //     secondary?: string;
  //   };
  // };
  
  layout: {
    borderRadius: {
      base: string;       // --radius base
      sm?: string;        // Se calcula automático si no existe
      lg?: string;        // Se calcula automático si no existe
      full?: string;      // Se calcula automático si no existe
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