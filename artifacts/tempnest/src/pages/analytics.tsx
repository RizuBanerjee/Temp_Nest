import { useGetUsageAnalytics } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

const CHART_COLORS = {
  emails: "#8b5cf6",
  credits: "#06b6d4",
  otps: "#10b981",
  inboxes: "#f59e0b",
};

function StatCard({ label, value, isLoading }: { label: string; value: number; isLoading: boolean }) {
  return (
    <Card className="p-4 bg-card border-border/60">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      {isLoading ? <Skeleton className="h-8 w-16" /> : (
        <p className="text-2xl font-bold font-mono">{value.toLocaleString()}</p>
      )}
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="font-mono font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { data: analytics, isLoading } = useGetUsageAnalytics();

  const chartData = analytics?.daily?.map(d => ({
    date: d.date.slice(5), // MM-DD
    emails: d.emailsReceived,
    credits: d.creditsUsed,
    otps: d.otpsExtracted,
    inboxes: d.inboxesCreated,
  })) ?? [];

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Your usage over the last 30 days.</p>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Emails" value={analytics?.totals?.totalEmails ?? 0} isLoading={isLoading} />
            <StatCard label="Total Inboxes" value={analytics?.totals?.totalInboxes ?? 0} isLoading={isLoading} />
            <StatCard label="Credits Used" value={analytics?.totals?.totalCreditsUsed ?? 0} isLoading={isLoading} />
            <StatCard label="OTPs Extracted" value={analytics?.totals?.totalOtps ?? 0} isLoading={isLoading} />
          </div>

          {/* Emails & OTPs Chart */}
          <Card className="p-6 bg-card border-border/60">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Emails Received & OTPs</h2>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="emails" stroke={CHART_COLORS.emails} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="otps" stroke={CHART_COLORS.otps} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Credits Usage Chart */}
          <Card className="p-6 bg-card border-border/60">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Credits Used Per Day</h2>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="credits" fill={CHART_COLORS.credits} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
