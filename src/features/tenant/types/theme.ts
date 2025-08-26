export interface ThemeManifest {
    version: string;
    metadata: {
        name: string;
        description?: string
        createdAt: string
        updatedAt: string
    }

    colors: {
        primary: string;
        secondary?: string;
        accent?: string;
        success?: string;
        warning?: string;
        background?: {
            primary?: string;
            secondary?: string;
            card?: string;
        }
        text?: {
            primary: string;
            secondary: string;
            muted: string;
        }
        border?: {
            default: string;
            focus: string;
        }
    }
    typography?: {
        fontFamily: {
            primary: string;
            secondary?: string;
        }
    }
    layout?: {
        borderRadius: {
            base: string;
        }
    }
    assets?: {
        logo?: {
            light: string;
            dark?: string;
        }
        favicon?: string;
    }
}