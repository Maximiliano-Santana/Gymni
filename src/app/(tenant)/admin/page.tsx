import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { headers } from "next/headers";
import db from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, AlertTriangle, DollarSign } from "lucide-react";

export default async function AdminDashboardPage() {
  const [session, h] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);
  const sub = h.get("x-tenant-subdomain")!;
  const tenantId = session!.user.tenants?.[sub]?.tenantId as string;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const [activeMembers, activeSubs, expiringSubs, monthlyRevenue] =
    await Promise.all([
      db.tenantUser.count({
        where: { tenantId, roles: { has: "MEMBER" }, status: "ACTIVE" },
      }),
      db.memberSubscription.count({
        where: { tenantId, status: "ACTIVE" },
      }),
      db.memberSubscription.count({
        where: {
          tenantId,
          status: "ACTIVE",
          billingEndsAt: { gte: now, lte: in7Days },
        },
      }),
      db.memberPayment.aggregate({
        where: { tenantId, paidAt: { gte: startOfMonth } },
        _sum: { amountCents: true },
      }),
    ]);

  const revenueCents = monthlyRevenue._sum.amountCents ?? 0;
  const revenueFormatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(revenueCents / 100);

  const stats = [
    {
      title: "Miembros activos",
      value: activeMembers,
      icon: Users,
    },
    {
      title: "Suscripciones activas",
      value: activeSubs,
      icon: CreditCard,
    },
    {
      title: "Por vencer (7 días)",
      value: expiringSubs,
      icon: AlertTriangle,
    },
    {
      title: "Ingresos del mes",
      value: revenueFormatted,
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.title}
              </CardTitle>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
