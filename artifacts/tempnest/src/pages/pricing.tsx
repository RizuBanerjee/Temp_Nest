import {
  useListPlans,
  useCreateCheckoutSession,
  useGetMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, ChevronLeft, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Logo } from "@/components/logo";
import { BackButton } from "@/components/back-button";
import { motion } from "framer-motion";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "1 active inbox",
      "50 credit cap",
      "20 daily credit refill",
      "7-day email history",
      "OTP detection",
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9.99",
    period: "/month",
    features: [
      "10 active inboxes",
      "5,000 credits/month",
      "Unlimited email history",
      "Priority inbox processing",
      "Custom inbox names",
      "OTP history",
      "Priority support",
    ],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$29.99",
    period: "/month",
    features: [
      "Unlimited inboxes",
      "50,000 credits/month",
      "Unlimited email history",
      "API access",
      "Advanced analytics",
      "Custom domains",
      "Dedicated support",
    ],
    highlight: false,
  },
];

export default function Pricing() {
  const checkout = useCreateCheckoutSession();
  const { isSignedIn, isLoaded } = useAuth();
  const { data: user } = useGetMe({
    query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey() },
  });

  const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, business: 2 };
  function comparePlans(a: string, b: string): number {
    return (PLAN_RANK[a] ?? 0) - (PLAN_RANK[b] ?? 0);
  }
  function isPlanActive(): boolean {
    if (user?.currentPlan === "free") return true;
    if (!user?.planExpiryDate) return false;
    return new Date(user.planExpiryDate).getTime() > Date.now();
  }

  async function subscribe(planId: string) {
    if (planId === "free") {
      window.location.href = isSignedIn ? "/dashboard" : "/sign-up";
      return;
    }
    if (!isSignedIn) {
      window.location.href = "/sign-up?redirect=/pricing";
      return;
    }
    if (
      comparePlans(planId, user?.currentPlan || "free") < 0 &&
      isPlanActive()
    ) {
      toast.error(
        "You cannot downgrade while your current plan is active. Go to Credits to schedule a downgrade.",
      );
      return;
    }
    try {
      const result = await checkout.mutateAsync({
        data: { type: "subscription", planId },
      });
      if (result.url?.includes("error=plan_not_configured")) {
        toast.error(
          "This plan is not configured for checkout yet. Please add the Stripe price ID.",
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

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="h-16 border-b border-border/40 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <Logo />
        </div>
        <div className="flex gap-3">
          {isLoaded && isSignedIn ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/credits">
                <Button variant="outline" size="sm">
                  Buy Credits
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start free. Upgrade when you need more power. No surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const isCurrent = user?.currentPlan === plan.id;
            const isLower =
              comparePlans(plan.id, user?.currentPlan || "free") < 0;
            const isDowngradeBlocked = isLower && isPlanActive();
            return (
              <motion.div
                key={plan.id}
                className={`relative rounded-2xl border p-8 transition-colors hover:border-primary/50 ${
                  plan.highlight
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_40px_rgba(124,58,237,0.15)]"
                    : "border-border/60 bg-card"
                }`}
                whileHover={{
                  y: -6,
                  scale: 1.02,
                  boxShadow: "0 20px 40px -12px rgba(124, 58, 237, 0.25)",
                  transition: { duration: 0.15, ease: "easeOut" },
                }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 flex items-center gap-1">
                      <Zap size={11} /> Most Popular
                    </Badge>
                  </div>
                )}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    {isCurrent && (
                      <Badge
                        variant="outline"
                        className="text-emerald-400 border-emerald-400/30"
                      >
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm mb-1">
                      {plan.period}
                    </span>
                  </div>
                  {isCurrent && user?.planExpiryDate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <Calendar size={12} className="inline mr-1" />
                      Active until{" "}
                      {new Date(user.planExpiryDate).toLocaleString()}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check size={14} className="text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => subscribe(plan.id)}
                  disabled={
                    checkout.isPending || isCurrent || isDowngradeBlocked
                  }
                >
                  {isCurrent
                    ? "Current Plan"
                    : isDowngradeBlocked
                      ? "Active Plan"
                      : plan.id === "free"
                        ? "Get Started Free"
                        : `Subscribe to ${plan.name}`}
                </Button>
                {isDowngradeBlocked && (
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Available after your current plan expires
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
