import { useGetUsageAnalytics } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { BackButton } from "@/components/back-button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Mail, Key, Zap, Inbox } from "lucide-react";
import { motion } from "framer-motion";

const CHART_COLORS = {
  emails: "#8b5cf6",
  credits: "#06b6d4",
  otps: "#10b981",
  inboxes: "#f59e0b",
};

const MotionCard = motion(Card);

function StatCard({ label, value, icon: Icon, isLoading, color, desc }: { label: string; value: number; icon: any; isLoading: boolean; color: string; desc: string }) {
  return (
    <MotionCard
      className="p-4 bg-card border-border/60 group hover:border-primary/30 transition-colors"
      whileHover={{
        y: -6,
        scale: 1.02,
        boxShadow: "0 20px 40px -12px rgba(124, 58, 237, 0.25)",
        transition: { duration: 0.15, ease: "easeOut" },
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon size={16} className={color} />
      </div>
      {isLoading ? <Skeleton className="h-8 w-16 mb-1" /> : (
        <p className="text-2xl font-bold font-mono mb-1">{value.toLocaleString()}</p>
      )}
      <p className="text-xs text-muted-foreground">{desc}</p>
    </MotionCard>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
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
    date: d.date.slice(5),
    emails: d.emailsReceived,
    credits: d.creditsUsed,
    otps: d.otpsExtracted,
    inboxes: d.inboxesCreated,
  })) ?? [];

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <BackButton />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Your usage patterns over the last 30 days.</p>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Emails" value={analytics?.totals?.totalEmails ?? 0} icon={Mail} isLoading={isLoading} color="text-violet-400" desc="Received across all inboxes" />
            <StatCard label="Total Inboxes" value={analytics?.totals?.totalInboxes ?? 0} icon={Inbox} isLoading={isLoading} color="text-amber-400" desc="Inboxes created over 30 days" />
            <StatCard label="Credits Used" value={analytics?.totals?.totalCreditsUsed ?? 0} icon={Zap} isLoading={isLoading} color="text-cyan-400" desc="Total credits consumed" />
            <StatCard label="OTPs Extracted" value={analytics?.totals?.totalOtps ?? 0} icon={Key} isLoading={isLoading} color="text-emerald-400" desc="Verification codes found" />
          </div>

          {/* OTP Rate */}
          {!isLoading && analytics?.totals && analytics.totals.totalEmails > 0 && (
            <Card className="p-4 bg-card border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-primary" />
                <span className="text-sm font-semibold">OTP Detection Rate</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min((analytics.totals.totalOtps / analytics.totals.totalEmails) * 100, 100)}%` }}
                  />
                </div>
                <span className="font-mono text-sm font-semibold text-emerald-400">
                  {((analytics.totals.totalOtps / analytics.totals.totalEmails) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.totals.totalOtps} of {analytics.totals.totalEmails} emails contained OTP codes
              </p>
            </Card>
          )}

          {/* Emails & OTPs Chart */}
          <Card className="p-6 bg-card border-border/60">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Emails Received & OTPs Detected</h2>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                <p>No data yet — start receiving emails to see charts here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="emails" stroke={CHART_COLORS.emails} strokeWidth={2} dot={false} name="Emails" />
                  <Line type="monotone" dataKey="otps" stroke={CHART_COLORS.otps} strokeWidth={2} dot={false} name="OTPs" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Credits Usage Chart */}
          <Card className="p-6 bg-card border-border/60">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Credits Consumed Per Day</h2>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                <p>No credit usage recorded yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="credits" fill={CHART_COLORS.credits} radius={[3, 3, 0, 0]} name="Credits" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
