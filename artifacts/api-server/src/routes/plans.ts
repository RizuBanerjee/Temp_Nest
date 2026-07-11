import { Router } from "express";

const router = Router();

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: string;
  credits: number;
  maxInboxes: number;
  maxCredits: number;
  dailyRefill: number;
  features: string[];
  stripePriceId: string | null;
}

const PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "usd",
    billingPeriod: "forever",
    credits: 50,
    maxInboxes: 1,
    maxCredits: 50,
    dailyRefill: 20,
    features: [
      "1 active inbox",
      "50 credit cap",
      "20 daily credit refill",
      "7-day email history",
      "OTP detection",
      "Basic support",
    ],
    stripePriceId: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: 999,
    currency: "usd",
    billingPeriod: "month",
    credits: 5000,
    maxInboxes: 10,
    maxCredits: 5000,
    dailyRefill: 0,
    features: [
      "10 active inboxes",
      "5,000 credits/month",
      "Unlimited email history",
      "Priority inbox processing",
      "Custom inbox names",
      "OTP detection + history",
      "Priority support",
      "No ads",
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
  },
  {
    id: "business",
    name: "Business",
    price: 2999,
    currency: "usd",
    billingPeriod: "month",
    credits: 50000,
    maxInboxes: -1, // unlimited
    maxCredits: 50000,
    dailyRefill: 0,
    features: [
      "Unlimited inboxes",
      "50,000 credits/month",
      "Unlimited email history",
      "API access",
      "Advanced analytics",
      "Priority support",
      "Custom domains",
      "Team management",
    ],
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID || null,
  },
];

export const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, business: 2 };

export function comparePlans(a: string, b: string): number {
  return (PLAN_RANK[a] ?? 0) - (PLAN_RANK[b] ?? 0);
}

export function isHigherPlan(a: string, b: string): boolean {
  return comparePlans(a, b) > 0;
}

export function isPlanActive(user: { currentPlan: string; planExpiryDate: Date | null }): boolean {
  if (user.currentPlan === "free") return true;
  if (!user.planExpiryDate) return false;
  return user.planExpiryDate.getTime() > Date.now();
}

const CREDIT_PACKS = [
  { id: "pack_500", name: "Starter Pack", credits: 500, price: 499, currency: "usd", stripePriceId: process.env.STRIPE_PACK_500_PRICE_ID || null },
  { id: "pack_1200", name: "Value Pack", credits: 1200, price: 999, currency: "usd", stripePriceId: process.env.STRIPE_PACK_1200_PRICE_ID || null },
  { id: "pack_3000", name: "Pro Pack", credits: 3000, price: 1999, currency: "usd", stripePriceId: process.env.STRIPE_PACK_3000_PRICE_ID || null },
  { id: "pack_10000", name: "Business Pack", credits: 10000, price: 4999, currency: "usd", stripePriceId: process.env.STRIPE_PACK_10000_PRICE_ID || null },
];

router.get("/", (_req, res) => {
  res.json(PLANS);
});

export { PLANS, CREDIT_PACKS };
export default router;
