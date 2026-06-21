import { Router } from "express";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { getAuth } from "@clerk/express";
import { db, usersTable, paymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CREDIT_PACKS, PLANS } from "./plans";

const router = Router();

// Build Stripe checkout URL (or fallback if no Stripe key)
router.post("/checkout", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const auth = getAuth(req);
    const user = await getOrCreateUser(clerkId, (auth?.sessionClaims?.email as string) || "", "");
    const { type, planId, creditPackId } = req.body;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      res.json({ url: "/credits?error=stripe_not_configured" }); return;
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-05-27.dahlia" });

    const successUrl = `${process.env.APP_URL || "http://localhost"}/credits?success=1`;
    const cancelUrl = `${process.env.APP_URL || "http://localhost"}/credits`;

    if (type === "credits" && creditPackId) {
      const pack = CREDIT_PACKS.find(p => p.id === creditPackId);
      if (!pack) { res.status(400).json({ error: "Invalid credit pack" }); return; }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: pack.currency,
            unit_amount: pack.price,
            product_data: { name: `TempNest ${pack.name} — ${pack.credits} Credits` },
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId: String(user.id), type: "credits", creditPackId, credits: String(pack.credits) },
        customer_email: user.email,
      });

      await db.insert(paymentsTable).values({
        userId: user.id,
        stripeSessionId: session.id,
        amount: pack.price / 100,
        currency: pack.currency,
        type: "credits",
        creditPackId,
        creditsGranted: pack.credits,
        status: "pending",
      });

      res.json({ url: session.url }); return;
    }

    if (type === "subscription" && planId) {
      const plan = PLANS.find(p => p.id === planId);
      if (!plan || !plan.stripePriceId) {
        res.json({ url: "/credits?error=plan_not_configured" }); return;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId: String(user.id), type: "subscription", planId },
        customer_email: user.email,
      });

      res.json({ url: session.url }); return;
    }

    res.status(400).json({ error: "Invalid checkout request" });
  } catch (err) {
    req.log.error({ err }, "Failed to create checkout session");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      res.json({ received: true }); return;
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-05-27.dahlia" });

    const sig = req.headers["stripe-signature"] as string;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (_) {
      res.status(400).json({ error: "Webhook signature failed" }); return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const { userId, type, credits, planId } = session.metadata || {};
      const uid = Number(userId);

      if (type === "credits" && credits) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid));
        if (user) {
          const newCredits = user.credits + Number(credits);
          await db.update(usersTable).set({ credits: newCredits, updatedAt: new Date() }).where(eq(usersTable.id, uid));
        }
        await db.update(paymentsTable).set({ status: "completed" })
          .where(eq(paymentsTable.stripeSessionId, session.id));
      }

      if (type === "subscription" && planId) {
        const planConfig: Record<string, { credits: number; maxInboxes: number; maxCredits: number }> = {
          pro: { credits: 1000, maxInboxes: 5, maxCredits: 1000 },
          business: { credits: 5000, maxInboxes: -1, maxCredits: 5000 },
        };
        const planInfo = planConfig[planId];
        if (planInfo) {
          await db.update(usersTable).set({
            plan: planId as any,
            credits: planInfo.credits,
            maxCredits: planInfo.maxCredits,
            maxInboxes: planInfo.maxInboxes,
            updatedAt: new Date(),
          }).where(eq(usersTable.id, uid));
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: "Webhook error" });
  }
});

export default router;
