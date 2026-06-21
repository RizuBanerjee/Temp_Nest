import { useGetCredits, useListCreditTransactions, useListPlans, useCreateCheckoutSession, getGetCreditsQueryKey } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, TrendingUp, TrendingDown, Package, Star } from "lucide-react";
import { toast } from "sonner";

const CREDIT_PACKS = [
  { id: "pack_500", name: "Starter", credits: 500, price: "$4.99", highlight: false },
  { id: "pack_1200", name: "Value", credits: 1200, price: "$9.99", highlight: true },
  { id: "pack_3000", name: "Pro Pack", credits: 3000, price: "$19.99", highlight: false },
  { id: "pack_10000", name: "Business", credits: 10000, price: "$49.99", highlight: false },
];

function CreditBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
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
        toast.error("Stripe is not configured yet. Add your Stripe keys to enable payments.");
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to initiate checkout");
    }
  }

  const txTypeIcon = (type: string) => {
    if (type === "debit") return <TrendingDown size={14} className="text-red-400" />;
    if (type === "credit" || type === "refill" || type === "purchase") return <TrendingUp size={14} className="text-emerald-400" />;
    return <Zap size={14} className="text-muted-foreground" />;
  };

  const txTypeColor = (type: string) => {
    if (type === "debit") return "text-red-400";
    return "text-emerald-400";
  };

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Credits</h1>
            <p className="text-muted-foreground text-sm mt-1">Your credit wallet and transaction history.</p>
          </div>

          {/* Wallet Card */}
          <Card className="p-6 bg-card border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-primary" />
              <span className="font-semibold">Credit Wallet</span>
            </div>
            {walletLoading ? <Skeleton className="h-16 w-full" /> : (
              <CreditBar current={wallet?.balance ?? 0} max={wallet?.maxBalance ?? 100} />
            )}
            <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
              <span>Daily refill: <strong className="text-foreground">{wallet?.dailyRefill ?? 0}</strong></span>
              <span>Last refill: <strong className="text-foreground">{wallet?.lastRefillAt ? new Date(wallet.lastRefillAt).toLocaleDateString() : "Never"}</strong></span>
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
                  <div className="text-xs text-muted-foreground mb-4">credits</div>
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
                <p>No transactions yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card/50 border border-border/30">
                    {txTypeIcon(tx.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <div className={`font-mono text-sm font-semibold ${txTypeColor(tx.type)}`}>
                      {tx.type === "debit" ? "-" : "+"}{tx.amount}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground w-16 text-right">
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
