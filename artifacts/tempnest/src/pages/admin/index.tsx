import { useGetAdminStats } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Inbox, Mail, DollarSign, Zap, TrendingUp, UserCheck, Building2 } from "lucide-react";
import { motion } from "framer-motion";

const MotionCard = motion(Card);

function StatCard({ label, value, icon: Icon, isLoading }: { label: string; value: number | string; icon: any; isLoading: boolean }) {
  return (
    <MotionCard
      className="p-5 bg-card border-border/60 group hover:border-primary/30 transition-colors"
      whileHover={{
        y: -6,
        scale: 1.02,
        boxShadow: "0 20px 40px -12px rgba(124, 58, 237, 0.25)",
        transition: { duration: 0.15, ease: "easeOut" },
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon size={16} className="text-primary opacity-70" />
      </div>
      {isLoading ? <Skeleton className="h-8 w-20" /> : (
        <p className="text-2xl font-bold font-mono">{typeof value === "number" ? value.toLocaleString() : value}</p>
      )}
    </MotionCard>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Admin overview
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Platform-wide metrics and controls.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={Users} isLoading={isLoading} />
            <StatCard label="Active Users" value={stats?.activeUsers ?? 0} icon={UserCheck} isLoading={isLoading} />
            <StatCard label="Total Inboxes" value={stats?.totalInboxes ?? 0} icon={Inbox} isLoading={isLoading} />
            <StatCard label="Total Emails" value={stats?.totalEmails ?? 0} icon={Mail} isLoading={isLoading} />
            <StatCard label="Total Revenue" value={`$${(stats?.totalRevenue ?? 0).toFixed(2)}`} icon={DollarSign} isLoading={isLoading} />
            <StatCard label="Credits Issued" value={stats?.creditsIssued ?? 0} icon={Zap} isLoading={isLoading} />
            <StatCard label="Pro Users" value={stats?.proUsers ?? 0} icon={TrendingUp} isLoading={isLoading} />
            <StatCard label="Business Users" value={stats?.businessUsers ?? 0} icon={Building2} isLoading={isLoading} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <MotionCard
              className="p-5 bg-card border-border/60 hover:border-primary/30 transition-colors"
              whileHover={{
                y: -6,
                scale: 1.02,
                boxShadow: "0 20px 40px -12px rgba(124, 58, 237, 0.25)",
                transition: { duration: 0.15, ease: "easeOut" },
              }}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Today</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New users</span>
                  {isLoading ? <Skeleton className="h-4 w-10" /> : <span className="font-mono font-semibold">{stats?.newUsersToday ?? 0}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Emails received</span>
                  {isLoading ? <Skeleton className="h-4 w-10" /> : <span className="font-mono font-semibold">{stats?.emailsToday ?? 0}</span>}
                </div>
              </div>
            </MotionCard>
            <MotionCard
              className="p-5 bg-card border-border/60 hover:border-primary/30 transition-colors"
              whileHover={{
                y: -6,
                scale: 1.02,
                boxShadow: "0 20px 40px -12px rgba(124, 58, 237, 0.25)",
                transition: { duration: 0.15, ease: "easeOut" },
              }}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Plan Distribution</p>
              {isLoading ? <Skeleton className="h-16 w-full" /> : (
                <div className="space-y-3">
                  {[
                    { label: "Free", count: (stats?.totalUsers ?? 0) - (stats?.proUsers ?? 0) - (stats?.businessUsers ?? 0), color: "bg-muted-foreground" },
                    { label: "Pro", count: stats?.proUsers ?? 0, color: "bg-violet-500" },
                    { label: "Business", count: stats?.businessUsers ?? 0, color: "bg-amber-500" },
                  ].map(p => (
                    <div key={p.label} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${p.color}`} />
                      <span className="text-sm text-muted-foreground flex-1">{p.label}</span>
                      <span className="font-mono text-sm font-semibold">{p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </MotionCard>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
