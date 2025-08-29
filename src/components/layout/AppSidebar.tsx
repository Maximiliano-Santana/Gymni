// src/components/layout/AppSidebar.tsx
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import { Home, Building2, CreditCard } from "lucide-react"
import SidebarLink from "./SidebarLink"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarLink href="/superadmin">
                <Home className="h-4 w-4" />
                Inicio
              </SidebarLink>
              <SidebarLink href="/superadmin/tenants">
                <Building2 className="h-4 w-4" />
                Tenants
              </SidebarLink>
              <SidebarLink href="/superadmin/tenants/payments">
                <CreditCard className="h-4 w-4" />
                Payments
              </SidebarLink>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
