import { Router } from "express";

const router = Router();

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "usd",
    billingPeriod: "forever",
    credits: 100,
    maxInboxes: 1,
    maxCredits: 100,
    dailyRefill: 20,
    features: [
      "1 active inbox",
      "100 credit cap",
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
    credits: 1000,
    maxInboxes: 5,
    maxCredits: 1000,
    dailyRefill: 0,
    features: [
      "5 active inboxes",
      "1,000 credits/month",
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
    credits: 5000,
    maxInboxes: -1, // unlimited
    maxCredits: 5000,
    dailyRefill: 0,
    features: [
      "Unlimited inboxes",
      "5,000 credits/month",
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
