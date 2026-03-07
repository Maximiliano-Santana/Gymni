"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/features/tenants/providers/TenantContext";

export default function AdminHeader() {
  const { data: session } = useSession();
  const tenant = useTenant();
  const roles = session?.user?.tenants?.[tenant.subdomain]?.roles ?? [];
  const isMember = roles.includes("MEMBER");
  const name = session?.user?.name ?? "U";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex min-h-14 items-center gap-3 border-b px-4" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="size-8">
              <AvatarImage src={session?.user?.image ?? undefined} alt={name} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isMember && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 size-4" />
                  Mi panel
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}>
            <LogOut className="mr-2 size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
