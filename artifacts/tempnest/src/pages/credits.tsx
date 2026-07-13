import { useEffect, useState, useCallback } from "react";
import { useSearch, Link } from "wouter";
import {
  useGetCredits,
  useCreateCheckoutSession,
  useGetMe,
  useListPlans,
  useScheduleDowngrade,
} from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Package,
  Star,
  Info,
  Check,
  X,
  ArrowRight,
  Crown,
  AlertCircle,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const CREDIT_PACKS = [
  {
    id: "pack_500",
    name: "Starter",
    credits: 500,
    price: "$4.99",
    perCredit: "$0.01",
    highlight: false,
  },
  {
    id: "pack_1200",
    name: "Value",
    credits: 1200,
    price: "$9.99",
    perCredit: "$0.0083",
    highlight: true,
  },
  {
    id: "pack_3000",
    name: "Pro Pack",
    credits: 3000,
    price: "$19.99",
    perCredit: "$0.0067",
    highlight: false,
  },
  {
    id: "pack_10000",
    name: "Business",
    credits: 10000,
    price: "$49.99",
    perCredit: "$0.005",
    highlight: false,
  },
];

const CREDIT_COSTS = [
  { action: "Create inbox", cost: "2 credits" },
  { action: "Custom inbox name", cost: "+5 credits" },
  { action: "Priority inbox", cost: "+10 credits" },
  { action: "Refresh inbox", cost: "1 credit" },
  { action: "Receive email", cost: "1 credit" },
];

interface PaymentRecord {
  id: number;
  amount: number;
  currency: string;
  type: "credits" | "subscription";
  planId?: string | null;
  creditPackId?: string | null;
  creditsGranted?: number | null;
  status: string;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreditTransaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

interface HistoryControls {
  page: number;
  limit: number;
  search: string;
  sort: "desc" | "asc";
  filter: string;
}

function CreditBar({ current, max }: { current: number; max: number }) {
  const isUnlimited = max === -1;
  const pct = isUnlimited
    ? 100
    : max > 0
      ? Math.min((current / max) * 100, 100)
      : 0;
  const color = isUnlimited
    ? "bg-emerald-500"
    : pct > 50
      ? "bg-emerald-500"
      : pct > 20
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-4xl font-bold font-mono">
          {current.toLocaleString()}
        </span>
        <span className="text-muted-foreground text-sm">
          / {isUnlimited ? "∞" : max.toLocaleString()} max
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {isUnlimited
          ? "Unlimited credits"
          : `${pct.toFixed(0)}% of your credit limit remaining`}
      </p>
    </div>
  );
}

function HistoryPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className={
              page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>
        {getPages().map((p, i) =>
          p === "..." ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <span className="px-2 text-muted-foreground">...</span>
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                isActive={p === page}
                onClick={() => onPageChange(p as number)}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className={
              page >= totalPages
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default function Credits() {
  const { data: wallet, isLoading: walletLoading } = useGetCredits();
  const { data: user } = useGetMe();
  const { data: plans } = useListPlans();
  const checkout = useCreateCheckoutSession();
  const queryClient = useQueryClient();
  const search = useSearch();

  const [payments, setPayments] = useState<PaginatedResponse<PaymentRecord> | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentControls, setPaymentControls] = useState<HistoryControls>({
    page: 1,
    limit: 10,
    search: "",
    sort: "desc",
    filter: "all",
  });

  const [transactions, setTransactions] = useState<PaginatedResponse<CreditTransaction> | null>(null);
  const [txLoading, setTxLoading] = useState(true);
  const [txControls, setTxControls] = useState<HistoryControls>({
    page: 1,
    limit: 10,
    search: "",
    sort: "desc",
    filter: "all",
  });

  const [verifying, setVerifying] = useState(false);

  const params = new URLSearchParams(search);
  const success = params.get("success");
  const error = params.get("error");
  const sessionId = params.get("session_id");

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(paymentControls.page));
      qs.set("limit", String(paymentControls.limit));
      qs.set("sort", paymentControls.sort);
      if (paymentControls.filter !== "all") qs.set("status", paymentControls.filter);
      if (paymentControls.search.trim()) qs.set("search", paymentControls.search.trim());
      const res = await apiFetch(`/api/payments/history?${qs.toString()}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setPayments(await res.json());
    } catch (err) {
      console.error("Failed to load payment history", err);
      setPayments(null);
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentControls]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(txControls.page));
      qs.set("limit", String(txControls.limit));
      qs.set("sort", txControls.sort);
      if (txControls.filter !== "all") qs.set("type", txControls.filter);
      if (txControls.search.trim()) qs.set("search", txControls.search.trim());
      const res = await apiFetch(`/api/credits/transactions?${qs.toString()}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setTransactions(await res.json());
    } catch (err) {
      console.error("Failed to load transaction history", err);
      setTransactions(null);
    } finally {
      setTxLoading(false);
    }
  }, [txControls]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (success) {
      if (sessionId) {
        verifySession(sessionId);
      } else {
        toast.success(
          "Payment completed! Your account will be updated shortly.",
        );
        queryClient.invalidateQueries();
      }
      window.history.replaceState({}, "", "/credits");
    } else if (error) {
      if (error === "payment_cancelled") {
        toast.error("Payment was cancelled.");
      } else if (error === "plan_not_configured") {
        toast.error(
          "Subscription plan is not configured for checkout. Please add the Stripe price ID.",
        );
      } else if (error === "stripe_not_configured") {
        toast.error(
          "Stripe is not configured. Add STRIPE_SECRET_KEY to enable payments.",
        );
      } else {
        toast.error("Payment failed or was not completed.");
      }
      window.history.replaceState({}, "", "/credits");
    }
  }, [success, error, sessionId, queryClient]);

  async function verifySession(id: string) {
    setVerifying(true);
    try {
      const res = await apiFetch(
        `/api/payments/verify-session?session_id=${encodeURIComponent(id)}`,
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 404 && errorData.error?.includes("not found")) {
          toast.success("Payment verified. Your account has been updated.");
          queryClient.invalidateQueries();
          await loadPayments();
          return;
        }
        throw new Error(errorData.error || "Failed");
      }
      const data = await res.json();
      if (data.type === "credits" && data.credits) {
        toast.success(
          `${data.credits.toLocaleString()} credits have been added to your account!`,
        );
      } else if (data.type === "subscription" && data.planId) {
        toast.success(`You are now subscribed to the ${data.planId} plan!`);
      } else if (data.alreadyApplied) {
        toast.success("Payment verified. Your account has been updated.");
      } else {
        toast.success("Payment completed successfully!");
      }
      queryClient.invalidateQueries();
      await loadPayments();
      await loadTransactions();
    } catch (err: any) {
      toast.error(
        err?.message || "Could not verify payment. It may still be processing.",
      );
    } finally {
      setVerifying(false);
    }
  }

  async function handleBuyPack(packId: string) {
    try {
      const result = await checkout.mutateAsync({
        data: { type: "credits", creditPackId: packId },
      });
      if (result.url?.includes("error")) {
        toast.error(
          "Stripe is not configured yet. Add STRIPE_SECRET_KEY to enable payments.",
        );
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to initiate checkout");
    }
  }

  async function handleSubscribe(planId: string) {
    try {
      const result = await checkout.mutateAsync({
        data: { type: "subscription", planId },
      });
      if (result.url?.includes("error=plan_not_configured")) {
        toast.error(
          "This plan is not configured for checkout. Please add the Stripe price ID.",
        );
      } else if (result.url?.includes("error=stripe_not_configured")) {
        toast.error("Stripe is not configured yet.");
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to start checkout");
    }
  }

  const scheduleDowngrade = useScheduleDowngrade();

  async function handleScheduleDowngrade(planId: string) {
    try {
      await scheduleDowngrade.mutateAsync({ data: { planId: planId as any } });
      toast.success(
        `Downgrade to ${planId} scheduled for when your current plan expires.`,
      );
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to schedule downgrade");
    }
  }

  const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, business: 2 };
  function comparePlans(a: string, b: string): number {
    return (PLAN_RANK[a] ?? 0) - (PLAN_RANK[b] ?? 0);
  }
  function isPlanActive(): boolean {
    if (user?.currentPlan === "free") return true;
    if (!user?.planExpiryDate) return false;
    return new Date(user.planExpiryDate).getTime() > Date.now();
  }
  const isCurrentPlan = (planId: string) => user?.currentPlan === planId;
  const isLowerPlan = (planId: string) =>
    comparePlans(planId, user?.currentPlan || "free") < 0;
  const isHigherPlan = (planId: string) =>
    comparePlans(planId, user?.currentPlan || "free") > 0;

  const txTypeIcon = (type: string) => {
    if (type === "debit")
      return <TrendingDown size={14} className="text-red-400" />;
    return <TrendingUp size={14} className="text-emerald-400" />;
  };

  const txTypeColor = (type: string) =>
    type === "debit" ? "text-red-400" : "text-emerald-400";

  const paymentRows = payments?.data ?? [];
  const transactionRows = transactions?.data ?? [];

  return (
    <MainLayout>
      <style>{`
        input[type="date"].date-filter::-webkit-calendar-picker-indicator {
          opacity: 0.7;
          cursor: pointer;
        }
        .dark input[type="date"].date-filter::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
      `}</style>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <BackButton />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Credits</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Credits power every action on TempNest — buy more or earn them
              daily.
            </p>
          </div>

          {verifying && (
            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span>Verifying your payment...</span>
              </div>
            </Card>
          )}
          {success && !verifying && (
            <Card className="p-4 border-emerald-500/30 bg-emerald-500/10">
              <div className="flex items-center gap-3 text-sm text-emerald-400">
                <Check size={18} />
                <span>Payment successful! Your account has been updated.</span>
              </div>
            </Card>
          )}
          {error && !success && (
            <Card className="p-4 border-red-500/30 bg-red-500/10">
              <div className="flex items-center gap-3 text-sm text-red-400">
                <X size={18} />
                <span>
                  {error === "payment_cancelled"
                    ? "Payment was cancelled."
                    : "Payment failed or was not completed."}
                </span>
              </div>
            </Card>
          )}

          <Card className="p-6 bg-card border-border/60">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={18} className="text-primary" />
              <span className="font-semibold">Credit Wallet</span>
            </div>
            {walletLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <CreditBar
                current={wallet?.balance ?? 0}
                max={wallet?.maxBalance ?? 100}
              />
            )}
            <div className="flex gap-6 mt-5 pt-4 border-t border-border/40">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Daily Refill
                </p>
                <p className="font-mono font-semibold">
                  {wallet?.dailyRefill ?? 0}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    credits/day
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Last Refill
                </p>
                <p className="text-sm">
                  {wallet?.lastRefillAt
                    ? new Date(wallet.lastRefillAt).toLocaleDateString()
                    : "Today"}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground mb-1">
                  Current Plan
                </p>
                <p className="text-sm font-medium capitalize">
                  {user?.currentPlan ?? "Free"}
                </p>
                {user?.planExpiryDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires {new Date(user.planExpiryDate).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {user?.planRenewalReminder && user?.planExpiryDate && (
            <Card className="p-4 border-amber-500/30 bg-amber-500/10">
              <div className="flex items-start gap-3 text-sm text-amber-400">
                <Clock size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Your plan expires soon</p>
                  <p className="text-amber-400/80">
                    Your {user.currentPlan} plan expires on{" "}
                    {new Date(user.planExpiryDate).toLocaleString()}. Subscribe
                    again to keep your premium features.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {user?.nextPlan && (
            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3 text-sm">
                <Calendar size={18} className="shrink-0 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Downgrade scheduled</p>
                  <p className="text-muted-foreground">
                    Your plan will change to{" "}
                    <span className="capitalize font-medium">
                      {user.nextPlan}
                    </span>{" "}
                    when your current plan expires on{" "}
                    {user.planExpiryDate
                      ? new Date(user.planExpiryDate).toLocaleString()
                      : "the next billing date"}
                    .
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 bg-card border-border/60 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown size={18} className="text-primary" />
              <span className="font-semibold">Upgrade Plan</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Upgrade to get more inboxes, credits, and premium features. Higher
              plans activate immediately; downgrades apply at the end of your
              current billing period.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {plans?.map((plan) => {
                const current = isCurrentPlan(plan.id);
                const lower = isLowerPlan(plan.id);
                const higher = isHigherPlan(plan.id);
                const active = isPlanActive();
                const canSubscribe = higher || !active;
                const canScheduleDowngrade = lower && active && !user?.nextPlan;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-4 ${plan.id === "pro" ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card/50"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{plan.name}</span>
                      {current && (
                        <Badge
                          variant="outline"
                          className="text-emerald-400 border-emerald-400/30"
                        >
                          Current
                        </Badge>
                      )}
                      {user?.nextPlan === plan.id && (
                        <Badge
                          variant="outline"
                          className="text-primary border-primary/30"
                        >
                          Scheduled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {plan.maxInboxes === -1
                        ? "Unlimited inboxes"
                        : `${plan.maxInboxes} active inboxes`}{" "}
                      · {plan.credits.toLocaleString()} credits
                    </p>
                    <div className="flex items-end gap-1 mb-3">
                      <span className="text-xl font-bold">
                        $
                        {(plan.price / 100).toFixed(
                          plan.price % 100 === 0 ? 0 : 2,
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground mb-1">
                        {plan.billingPeriod}
                      </span>
                    </div>
                    {plan.id === "free" ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={current}
                        onClick={() => (window.location.href = "/pricing")}
                      >
                        {current ? "Current Plan" : "View Plans"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={lower ? "outline" : "default"}
                        disabled={
                          checkout.isPending ||
                          scheduleDowngrade.isPending ||
                          current ||
                          (!canSubscribe && !canScheduleDowngrade)
                        }
                        onClick={() =>
                          canScheduleDowngrade
                            ? handleScheduleDowngrade(plan.id)
                            : handleSubscribe(plan.id)
                        }
                      >
                        {current
                          ? "Current Plan"
                          : user?.nextPlan === plan.id
                            ? "Scheduled"
                            : canScheduleDowngrade
                              ? "Schedule Downgrade"
                              : `Subscribe to ${plan.name}`}
                      </Button>
                    )}
                    {lower && active && (
                      <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        Available after current plan expires
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 bg-card border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <Info size={16} className="text-primary" />
              <h2 className="font-semibold text-sm">What do credits cost?</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {CREDIT_COSTS.map((c) => (
                <div
                  key={c.action}
                  className="bg-muted/30 rounded-lg p-3 text-center"
                >
                  <p className="font-mono text-sm font-bold text-primary">
                    {c.cost}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.action}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package size={18} className="text-primary" />
              Buy Credits
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CREDIT_PACKS.map((pack) => (
                <Card
                  key={pack.id}
                  className={`p-4 relative border ${pack.highlight ? "border-primary/50 bg-primary/5" : "border-border/60 bg-card"}`}
                >
                  {pack.highlight && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-2 flex items-center gap-1">
                        <Star size={10} /> Best Value
                      </Badge>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mb-1">
                    {pack.name}
                  </div>
                  <div className="font-mono text-2xl font-bold mb-0.5">
                    {pack.credits.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    credits
                  </div>
                  <div className="text-xs text-muted-foreground/60 mb-4">
                    {pack.perCredit}/credit
                  </div>
                  <div className="text-xl font-semibold mb-3">{pack.price}</div>
                  <Button
                    size="sm"
                    className="w-full"
                    variant={pack.highlight ? "default" : "outline"}
                    onClick={() => handleBuyPack(pack.id)}
                    disabled={checkout.isPending}
                  >
                    Buy Now
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-primary" />
              Payment History
            </h2>
            <Card className="p-4 bg-card border-border/60 mb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                  <Input
                    type="date"
                    placeholder="mm-dd-yyyy"
                    className="pl-9 date-filter"
                    value={paymentControls.search}
                    onChange={(e) =>
                      setPaymentControls((prev) => ({
                        ...prev,
                        search: e.target.value,
                        page: 1,
                      }))
                    }
                  />
                </div>
                <Select
                  value={paymentControls.filter}
                  onValueChange={(v) =>
                    setPaymentControls((prev) => ({ ...prev, filter: v, page: 1 }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={paymentControls.sort}
                  onValueChange={(v) =>
                    setPaymentControls((prev) => ({ ...prev, sort: v as "desc" | "asc", page: 1 }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest first</SelectItem>
                    <SelectItem value="asc">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(paymentControls.limit)}
                  onValueChange={(v) =>
                    setPaymentControls((prev) => ({
                      ...prev,
                      limit: Number(v),
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-28">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 rows</SelectItem>
                    <SelectItem value="10">10 rows</SelectItem>
                    <SelectItem value="20">20 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
            {paymentsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : !paymentRows.length ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                <AlertCircle size={32} className="mx-auto mb-3 opacity-20" />
                <p>No payments found.</p>
                <p className="text-xs mt-1">
                  Try changing the filters or date range.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 mb-1">
                    <div className="col-span-5">Item</div>
                    <div className="col-span-3">Amount</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Date</div>
                  </div>
                  {paymentRows.map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-lg bg-card/50 border border-border/30 hover:bg-card/80 transition-colors"
                    >
                      <div className="col-span-5 min-w-0">
                        <p className="text-sm truncate">
                          {p.type === "credits"
                            ? `${p.creditsGranted?.toLocaleString() ?? ""} Credits`
                            : `Subscription — ${p.planId ? p.planId.charAt(0).toUpperCase() + p.planId.slice(1) : ""}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.type === "credits" ? "Credit pack" : "Plan upgrade"}
                        </p>
                      </div>
                      <div className="col-span-3 font-mono text-sm">
                        ${p.amount.toFixed(2)} {p.currency.toUpperCase()}
                      </div>
                      <div className="col-span-2">
                        <Badge
                          className={`text-[10px] ${p.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : p.status === "pending" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-right text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
                {payments && (
                  <HistoryPagination
                    page={payments.pagination.page}
                    totalPages={payments.pagination.totalPages}
                    onPageChange={(p) =>
                      setPaymentControls((prev) => ({ ...prev, page: p }))
                    }
                  />
                )}
              </>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
            <Card className="p-4 bg-card border-border/60 mb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                  <Input
                    type="date"
                    placeholder="mm-dd-yyyy"
                    className="pl-9 date-filter"
                    value={txControls.search}
                    onChange={(e) =>
                      setTxControls((prev) => ({
                        ...prev,
                        search: e.target.value,
                        page: 1,
                    }))
                    }
                  />
                </div>
                <Select
                  value={txControls.filter}
                  onValueChange={(v) =>
                    setTxControls((prev) => ({ ...prev, filter: v, page: 1 }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="credit">Credits earned</SelectItem>
                    <SelectItem value="debit">Credits deducted</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={txControls.sort}
                  onValueChange={(v) =>
                    setTxControls((prev) => ({ ...prev, sort: v as "desc" | "asc", page: 1 }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest first</SelectItem>
                    <SelectItem value="asc">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(txControls.limit)}
                  onValueChange={(v) =>
                    setTxControls((prev) => ({
                      ...prev,
                      limit: Number(v),
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-28">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 rows</SelectItem>
                    <SelectItem value="10">10 rows</SelectItem>
                    <SelectItem value="20">20 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
            {txLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : !transactionRows.length ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                <Zap size={32} className="mx-auto mb-3 opacity-20" />
                <p>No transactions found.</p>
                <p className="text-xs mt-1">
                  Try changing the filters or date range.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 mb-1">
                    <div className="col-span-1"></div>
                    <div className="col-span-6">Description</div>
                    <div className="col-span-3 text-right">Amount</div>
                    <div className="col-span-2 text-right">Balance</div>
                  </div>
                  {transactionRows.map((tx) => (
                    <div
                      key={tx.id}
                      className="grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-lg bg-card/50 border border-border/30 hover:bg-card/80 transition-colors"
                    >
                      <div className="col-span-1">{txTypeIcon(tx.type)}</div>
                      <div className="col-span-6 min-w-0">
                        <p className="text-sm truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`col-span-3 font-mono text-sm font-semibold text-right ${txTypeColor(tx.type)}`}
                      >
                        {tx.type === "debit" ? "−" : "+"}
                        {tx.amount}
                      </div>
                      <div className="col-span-2 font-mono text-xs text-muted-foreground text-right">
                        {tx.balanceAfter}
                      </div>
                    </div>
                  ))}
                </div>
                {transactions && (
                  <HistoryPagination
                    page={transactions.pagination.page}
                    totalPages={transactions.pagination.totalPages}
                    onPageChange={(p) =>
                      setTxControls((prev) => ({ ...prev, page: p }))
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}