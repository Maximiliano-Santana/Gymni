"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTenant } from "@/features/tenants/providers/tenant-context";
import { getTenantSettings } from "@/features/tenants/types/settings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Home, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/qr", label: "Mi QR", icon: QrCode },
] as const;

export default function DashboardHeader() {
  const { data: session } = useSession();
  const tenant = useTenant();
  const pathname = usePathname();

  const settings = getTenantSettings(tenant);
  const logoUrl = settings?.assets?.logo?.light;

  const name = session?.user?.name ?? "Usuario";

  const handleSignOut = () =>
    signOut({ callbackUrl: `${window.location.origin}/login` });

  return (
    <>
      {/* Desktop header */}
      <header className="sticky top-0 z-10 border-b bg-card px-6 py-3 hidden md:flex items-center justify-between" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))" }}>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tenant.name}
                className="h-6 object-contain"
              />
            ) : (
              <span className="text-sm font-semibold text-foreground">
                {tenant.name}
              </span>
            )}
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className="text-sm"
                  >
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              {name}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-10 border-t bg-card md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-end justify-around px-4 pb-2 pt-1">
          {/* Inicio */}
          <Link
            href="/dashboard"
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 min-w-[64px]",
              pathname === "/dashboard"
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Home className="size-5" />
            <span className="text-[11px] font-medium">Inicio</span>
          </Link>

          {/* QR — center prominent */}
          <Link
            href="/dashboard/qr"
            className="flex flex-col items-center -mt-5"
          >
            <div
              className={cn(
                "size-14 rounded-full flex items-center justify-center shadow-lg",
                pathname === "/dashboard/qr"
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/90 text-primary-foreground"
              )}
            >
              <QrCode className="size-7" />
            </div>
            <span
              className={cn(
                "text-[11px] font-medium mt-0.5",
                pathname === "/dashboard/qr"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              Mi QR
            </span>
          </Link>

          {/* Cerrar sesión */}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 py-1 min-w-[64px] text-muted-foreground"
          >
            <LogOut className="size-5" />
            <span className="text-[11px] font-medium">Salir</span>
          </button>
        </div>
      </nav>
    </>
  );
}
