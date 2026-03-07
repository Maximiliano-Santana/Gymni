import type { ReactNode } from "react";
import DashboardHeader from "./_components/DashboardHeader";

export default function MemberDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <DashboardHeader />
      <main>{children}</main>
    </div>
  );
}
