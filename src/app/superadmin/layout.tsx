import type { ReactNode } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"


export default function SuperAdminLayout({ children }: { children: ReactNode }) {
return (
<SidebarProvider>
<AppSidebar />
<main className="min-h-screen w-full p-4">
<SidebarTrigger className="mb-4" />
{children}
</main>
</SidebarProvider>
)
}