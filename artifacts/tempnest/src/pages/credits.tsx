import { useGetCredits, useListCreditTransactions, useCreateCheckoutSession } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, TrendingUp, TrendingDown, Package, Star, Info } from "lucide-react";
import { toast } from "sonner";

const CREDIT_PACKS = [
  { id: "pack_500", name: "Starter", credits: 500, price: "$4.99", perCredit: "$0.01", highlight: false },
  { id: "pack_1200", name: "Value", credits: 1200, price: "$9.99", perCredit: "$0.0083", highlight: true },
  { id: "pack_3000", name: "Pro Pack", credits: 3000, price: "$19.99", perCredit: "$0.0067", highlight: false },
  { id: "pack_10000", name: "Business", credits: 10000, price: "$49.99", perCredit: "$0.005", highlight: false },
];

const CREDIT_COSTS = [
  { action: "Create inbox", cost: "2 credits" },
  { action: "Custom inbox name", cost: "+5 credits" },
  { action: "Priority inbox", cost: "+10 credits" },
  { action: "Refresh inbox", cost: "1 credit" },
  { action: "Receive email", cost: "1 credit" },
];

function CreditBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-4xl font-bold font-mono">{current.toLocaleString()}</span>
        <span className="text-muted-foreground text-sm">/ {max.toLocaleString()} max</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% of your credit limit remaining</p>
    </div>
  );
}

export default function Credits() {
  const { data: wallet, isLoading: walletLoading } = useGetCredits();
  const { data: transactions, isLoading: txLoading } = useListCreditTransactions();
  const checkout = useCreateCheckoutSession();

  async function handleBuyPack(packId: string) {
    try {
      const result = await checkout.mutateAsync({ data: { type: "credits", creditPackId: packId } });
      if (result.url?.includes("error")) {
        toast.error("Stripe is not configured yet. Add STRIPE_SECRET_KEY to enable payments.");
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to initiate checkout");
    }
  }

  const txTypeIcon = (type: string) => {
    if (type === "debit") return <TrendingDown size={14} className="text-red-400" />;
    return <TrendingUp size={14} className="text-emerald-400" />;
  };

  const txTypeColor = (type: string) => type === "debit" ? "text-red-400" : "text-emerald-400";

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <BackButton />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Credits</h1>
            <p className="text-muted-foreground text-sm mt-1">Credits power every action on TempNest — buy more or earn them daily.</p>
          </div>

          {/* Wallet Card */}
          <Card className="p-6 bg-card border-border/60">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={18} className="text-primary" />
              <span className="font-semibold">Credit Wallet</span>
            </div>
            {walletLoading ? <Skeleton className="h-16 w-full" /> : (
              <CreditBar current={wallet?.balance ?? 0} max={wallet?.maxBalance ?? 100} />
            )}
            <div className="flex gap-6 mt-5 pt-4 border-t border-border/40">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Daily Refill</p>
                <p className="font-mono font-semibold">{wallet?.dailyRefill ?? 0} <span className="text-xs text-muted-foreground font-normal">credits/day</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Refill</p>
                <p className="text-sm">{wallet?.lastRefillAt ? new Date(wallet.lastRefillAt).toLocaleDateString() : "Today"}</p>
              </div>
            </div>
          </Card>

          {/* Credit Cost Reference */}
          <Card className="p-5 bg-card border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <Info size={16} className="text-primary" />
              <h2 className="font-semibold text-sm">What do credits cost?</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {CREDIT_COSTS.map(c => (
                <div key={c.action} className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="font-mono text-sm font-bold text-primary">{c.cost}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.action}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Credit Packs */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package size={18} className="text-primary" />
              Buy Credits
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CREDIT_PACKS.map(pack => (
                <Card key={pack.id} className={`p-4 relative border ${pack.highlight ? "border-primary/50 bg-primary/5" : "border-border/60 bg-card"}`}>
                  {pack.highlight && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-2 flex items-center gap-1">
                        <Star size={10} /> Best Value
                      </Badge>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mb-1">{pack.name}</div>
                  <div className="font-mono text-2xl font-bold mb-0.5">{pack.credits.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mb-1">credits</div>
                  <div className="text-xs text-muted-foreground/60 mb-4">{pack.perCredit}/credit</div>
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

          {/* Transaction History */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
            {txLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : !transactions?.length ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                <Zap size={32} className="mx-auto mb-3 opacity-20" />
                <p>No transactions yet.</p>
                <p className="text-xs mt-1">Your credits will appear here as you use TempNest.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 mb-1">
                  <div className="col-span-1"></div>
                  <div className="col-span-6">Description</div>
                  <div className="col-span-3 text-right">Amount</div>
                  <div className="col-span-2 text-right">Balance</div>
                </div>
                {transactions.map(tx => (
                  <div key={tx.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-lg bg-card/50 border border-border/30 hover:bg-card/80 transition-colors">
                    <div className="col-span-1">{txTypeIcon(tx.type)}</div>
                    <div className="col-span-6 min-w-0">
                      <p className="text-sm truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <div className={`col-span-3 font-mono text-sm font-semibold text-right ${txTypeColor(tx.type)}`}>
                      {tx.type === "debit" ? "−" : "+"}{tx.amount}
                    </div>
                    <div className="col-span-2 font-mono text-xs text-muted-foreground text-right">
                      {tx.balanceAfter}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
