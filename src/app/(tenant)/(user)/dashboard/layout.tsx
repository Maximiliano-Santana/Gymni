import type { ReactNode } from "react";
import DashboardHeader from "./_components/DashboardHeader";

export default function MemberDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main>{children}</main>
    </div>
  );
}
