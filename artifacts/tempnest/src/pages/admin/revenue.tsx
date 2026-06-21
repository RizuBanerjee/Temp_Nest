import { useGetAdminRevenue } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PLAN_COLORS = { free: "#6b7280", pro: "#8b5cf6", business: "#f59e0b" };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="font-mono font-semibold text-foreground">
          ${typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function AdminRevenue() {
  const { data, isLoading } = useGetAdminRevenue();

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Revenue Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Financial overview and trends.</p>
          </div>

          <Card className="p-6 bg-card border-border/60">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</p>
            {isLoading ? <Skeleton className="h-10 w-32" /> : (
              <p className="text-4xl font-bold font-mono">${(data?.totalRevenue ?? 0).toFixed(2)}</p>
            )}
          </Card>

          <Card className="p-6 bg-card border-border/60">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Monthly Revenue</h2>
            {isLoading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.monthly ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-6 bg-card border-border/60">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Plan Distribution</h2>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={data?.planDistribution ?? []} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                      {(data?.planDistribution ?? []).map((entry: any) => (
                        <Cell key={entry.plan} fill={(PLAN_COLORS as any)[entry.plan] ?? "#6b7280"} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {(data?.planDistribution ?? []).map((p: any) => (
                    <div key={p.plan} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm" style={{ background: (PLAN_COLORS as any)[p.plan] ?? "#6b7280" }} />
                      <span className="text-sm capitalize text-muted-foreground w-16">{p.plan}</span>
                      <span className="font-mono text-sm font-semibold">{p.count}</span>
                      <span className="text-xs text-muted-foreground">({p.percentage?.toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
