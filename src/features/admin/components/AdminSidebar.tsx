"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CreditCard,
  Receipt,
  Settings,
  ScanLine,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTenant } from "@/features/tenants/providers/tenant-context";
import { getTenantSettings } from "@/features/tenants/types/settings";
import { canAccess, type AdminPage } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";

const NAV_ITEMS: {
  page: AdminPage;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}[] = [
  { page: "dashboard", label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { page: "checkin", label: "Check-in", href: "/admin/checkin", icon: ScanLine },
  { page: "members", label: "Miembros", href: "/admin/members", icon: Users },
  { page: "payments", label: "Pagos", href: "/admin/payments", icon: Receipt },
  { page: "staff", label: "Staff", href: "/admin/staff", icon: UserCog },
  { page: "plans", label: "Planes", href: "/admin/plans", icon: CreditCard },
  { page: "settings", label: "Configuración", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar({ roles }: { roles: TenantRole[] }) {
  const pathname = usePathname();
  const tenant = useTenant();
  const { isMobile, setOpenMobile } = useSidebar();

  const visibleItems = NAV_ITEMS.filter((item) => canAccess(item.page, roles));

  const settings = tenant ? getTenantSettings(tenant) : null;
  const logoUrl = settings?.mode === "light"
    ? settings?.assets?.logo?.light
    : (settings?.assets?.logo?.dark || settings?.assets?.logo?.light);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        {logoUrl ? (
          <img src={logoUrl} alt={tenant?.name ?? "Logo"} className="h-8 max-w-full object-contain" />
        ) : (
          <span className="text-sm font-semibold truncate">
            {tenant?.name ?? "Admin"}
          </span>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.page}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
