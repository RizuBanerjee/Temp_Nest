import { useGetDashboardSummary, useListInboxes } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Mail, Inbox, Key, Zap, ArrowRight } from "lucide-react";

function CreditBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const color = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Credits</span>
        <span className="font-mono font-semibold">{current.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Your activity at a glance.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Credits Left", value: isLoading ? null : summary?.credits, icon: Zap, sub: `/ ${summary?.maxCredits ?? "—"}` },
              { label: "Active Inboxes", value: isLoading ? null : summary?.inboxCount, icon: Inbox, sub: `/ ${summary?.maxInboxes ?? "—"} max` },
              { label: "Emails Today", value: isLoading ? null : summary?.emailsToday, icon: Mail, sub: "received" },
              { label: "OTPs Extracted", value: isLoading ? null : summary?.otpsExtracted, icon: Key, sub: "today" },
            ].map((stat) => (
              <Card key={stat.label} className="p-4 bg-card border-border/60">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <stat.icon size={16} className="text-primary opacity-70 mt-0.5" />
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold font-mono">{stat.value ?? 0}</span>
                    <span className="text-xs text-muted-foreground mb-1">{stat.sub}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Credit Bar */}
          <Card className="p-5 bg-card border-border/60">
            {isLoading ? <Skeleton className="h-8 w-full" /> : (
              <CreditBar current={summary?.credits ?? 0} max={summary?.maxCredits ?? 100} />
            )}
          </Card>

          {/* Recent Emails */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Emails</h2>
              <Link href="/inboxes">
                <button className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors">
                  View all <ArrowRight size={14} />
                </button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : !summary?.recentEmails?.length ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <Mail size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No emails yet</p>
                <p className="text-sm mt-1">Create an inbox to start receiving emails.</p>
                <Link href="/inboxes">
                  <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                    Create Inbox
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {summary.recentEmails.map((email) => (
                  <Link key={email.id} href={`/emails/${email.id}`}>
                    <div className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors hover:border-primary/30 hover:bg-card/80 ${email.isRead ? "border-border/40 bg-card/30" : "border-border/60 bg-card"}`}>
                      <div className="mt-0.5">
                        {!email.isRead && <div className="w-2 h-2 rounded-full bg-primary" />}
                        {email.isRead && <div className="w-2 h-2 rounded-full bg-transparent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs text-muted-foreground truncate">{email.from}</span>
                          {email.hasOtp && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/20 animate-pulse">
                              OTP
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm truncate ${email.isRead ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                          {email.subject}
                        </p>
                        {email.hasOtp && email.otpCode && (
                          <p className="text-xs text-primary font-mono mt-0.5">Code: {email.otpCode}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(email.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
