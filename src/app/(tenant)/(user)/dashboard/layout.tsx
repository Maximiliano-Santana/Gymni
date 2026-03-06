import type { ReactNode } from "react";
import DashboardHeader from "./_components/DashboardHeader";

export default function MemberDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <DashboardHeader />
      <main>{children}</main>
    </div>
  );
}
