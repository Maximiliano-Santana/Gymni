"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { ReactNode } from "react"

type SidebarLinkProps = {
  href: string
  children: ReactNode
}

export default function SidebarLink({ href, children }: SidebarLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + "/")

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={href} className="flex items-center gap-2">
          {children}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
