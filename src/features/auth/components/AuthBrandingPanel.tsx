import { Dumbbell } from "lucide-react";

interface AuthBrandingPanelProps {
  tenantName: string;
  logoUrl?: string | null;
}

export default function AuthBrandingPanel({
  tenantName,
  logoUrl,
}: AuthBrandingPanelProps) {
  return (
    <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex-col items-center justify-center p-12 text-primary-foreground">
      {/* Decorative circles */}
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary-foreground/5" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-foreground/5" />
      <div className="absolute top-1/2 left-1/4 h-48 w-48 rounded-full bg-primary-foreground/5" />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={tenantName}
            className="h-16 object-contain"
          />
        ) : (
          <Dumbbell className="h-16 w-16" />
        )}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{tenantName}</h2>
          <p className="text-primary-foreground/70 text-sm">
            Tu espacio fitness, simplificado
          </p>
        </div>
      </div>
    </div>
  );
}
