import { useState } from "react";
import { useGetMe, useUpdateMe, getGetMeQueryKey, useGetCurrentSubscription } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, CreditCard, Shield } from "lucide-react";

export default function Settings() {
  const { data: user, isLoading } = useGetMe();
  const { data: subscription } = useGetCurrentSubscription();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    business: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  async function handleSave() {
    try {
      await updateMe.mutateAsync({ data: { name } });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update");
    }
  }

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
          </div>

          {/* Profile */}
          <Card className="p-6 bg-card border-border/60 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <User size={16} className="text-primary" />
              <h2 className="font-semibold">Profile</h2>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled className="font-mono opacity-70" />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={name || user?.name || ""}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <Button onClick={handleSave} disabled={updateMe.isPending}>
                  {updateMe.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </Card>

          {/* Plan & Subscription */}
          <Card className="p-6 bg-card border-border/60 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={16} className="text-primary" />
              <h2 className="font-semibold">Plan & Credits</h2>
            </div>
            {isLoading ? <Skeleton className="h-24 w-full" /> : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Plan</span>
                  <Badge className={planColors[user?.plan ?? "free"]}>
                    {(user?.plan ?? "free").charAt(0).toUpperCase() + (user?.plan ?? "free").slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Credits</span>
                  <span className="font-mono text-sm">{user?.credits ?? 0} / {user?.maxCredits ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Daily Refill</span>
                  <span className="font-mono text-sm">{user?.dailyRefill ?? 0} credits/day</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Inboxes</span>
                  <span className="font-mono text-sm">{user?.activeInboxCount ?? 0} / {user?.maxInboxes === -1 ? "∞" : (user?.maxInboxes ?? 1)}</span>
                </div>
                {subscription && subscription.planId !== "free" && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-sm text-muted-foreground">Renewal</span>
                    <span className="text-sm">{subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "—"}</span>
                  </div>
                )}
                {user?.plan === "free" && (
                  <div className="pt-2">
                    <Button className="w-full" onClick={() => window.location.href = "/pricing"}>
                      Upgrade Plan
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Account Info */}
          <Card className="p-6 bg-card border-border/60 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-primary" />
              <h2 className="font-semibold">Account</h2>
            </div>
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Member since</span>
                  <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Account status</span>
                  <Badge className={user?.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-red-500/20 text-red-400"}>
                    {user?.status ?? "active"}
                  </Badge>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
