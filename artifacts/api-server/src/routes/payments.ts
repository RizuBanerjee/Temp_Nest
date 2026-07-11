import { Router } from "express";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { getAuth } from "@clerk/express";
import {
  db,
  usersTable,
  paymentsTable,
  creditTransactionsTable,
  subscriptionsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CREDIT_PACKS, PLANS, comparePlans, isPlanActive } from "./plans";

const router = Router();

function getAppUrl(): string {
  // Always use the canonical server URL for Stripe redirects. Never rely on request headers,
  // which can be attacker-controlled and lead to open-redirects.
  return process.env.APP_URL || "http://localhost";
}

async function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return null;
  const Stripe = (await import("stripe")).default;
  return new Stripe(stripeSecretKey, { apiVersion: "2026-05-27.dahlia" });
}

async function applyCreditPurchase(
  userId: number,
  credits: number,
  sessionId: string,
  amount: number,
  currency: string,
) {
  await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) return;

    // Only the worker that successfully flips the pending payment to completed may run side effects.
    const existingPayment = await tx
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.stripeSessionId, sessionId));
    let claimed = false;
    if (existingPayment.length > 0) {
      const [updated] = await tx
        .update(paymentsTable)
        .set({ status: "completed" })
        .where(
          and(
            eq(paymentsTable.id, existingPayment[0].id),
            eq(paymentsTable.status, "pending"),
          ),
        )
        .returning();
      claimed = !!updated;
    } else {
      await tx.insert(paymentsTable).values({
        userId,
        stripeSessionId: sessionId,
        amount,
        currency,
        type: "credits",
        creditPackId: null,
        creditsGranted: credits,
        status: "completed",
      });
      claimed = true;
    }
    if (!claimed) return; // another worker already fulfilled this session

    // Credit packs should be usable: raise the cap so purchased credits are not silently clipped.
    const targetMaxCredits = Math.max(user.maxCredits, user.credits + credits);
    const newCredits = user.credits + credits;

    await tx
      .update(usersTable)
      .set({
        credits: newCredits,
        maxCredits: targetMaxCredits,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId));

    await tx.insert(creditTransactionsTable).values({
      userId,
      type: "credit",
      amount: credits,
      description: `Credit purchase — ${credits} credits`,
      balanceAfter: newCredits,
    });
  });
}

async function cancelStripeSubscription(
  stripe: any,
  stripeSubscriptionId: string | null,
) {
  if (!stripe || !stripeSubscriptionId) return;
  try {
    await stripe.subscriptions.cancel(stripeSubscriptionId);
  } catch (err) {
    // Stripe may already cancel the subscription; do not fail the upgrade.
    console.warn(
      "Failed to cancel previous Stripe subscription",
      stripeSubscriptionId,
      err,
    );
  }
}

function getPlanExpiryDate(
  now: Date,
  plan: { billingPeriod: string },
  currentPeriodEnd?: Date | null,
): Date {
  // Prefer the Stripe subscription period end. If it is missing or somehow in the past,
  // fall back to a future date based on the plan's billing period so the paid plan is not
  // immediately expired by the next /me call.
  if (currentPeriodEnd && currentPeriodEnd.getTime() > now.getTime()) {
    return currentPeriodEnd;
  }
  const days =
    plan.billingPeriod === "month"
      ? 30
      : plan.billingPeriod === "year"
        ? 365
        : 30;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

async function applySubscription(
  userId: number,
  planId: string,
  sessionId: string,
  amount: number,
  currency: string,
  stripeSubscriptionId?: string | null,
  currentPeriodEnd?: Date | null,
) {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return;

  await db.transaction(async (tx) => {
    // Only the worker that successfully flips the pending payment to completed may run side effects.
    const existingPayment = await tx
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.stripeSessionId, sessionId));
    let claimed = false;
    if (existingPayment.length > 0) {
      const [updated] = await tx
        .update(paymentsTable)
        .set({ status: "completed" })
        .where(
          and(
            eq(paymentsTable.id, existingPayment[0].id),
            eq(paymentsTable.status, "pending"),
          ),
        )
        .returning();
      claimed = !!updated;
    } else {
      await tx.insert(paymentsTable).values({
        userId,
        stripeSessionId: sessionId,
        stripePaymentIntentId: null,
        amount,
        currency,
        type: "subscription",
        planId,
        creditsGranted: null,
        status: "completed",
      });
      claimed = true;
    }
    if (!claimed) return; // another worker already fulfilled this session

    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) return;

    const now = new Date();
    const planExpiry = getPlanExpiryDate(now, plan, currentPeriodEnd);

    // The checkout endpoint already rejects active downgrades, so any paid subscription we apply here is either
    // an upgrade, a renewal, or a new subscription after expiry. In all cases we activate it immediately.
    await tx
      .update(usersTable)
      .set({
        currentPlan: planId as any,
        nextPlan: null,
        planStartDate: now,
        planExpiryDate: planExpiry,
        planRenewalReminderSentAt: null,
        credits: plan.credits,
        maxCredits: plan.maxCredits,
        maxInboxes: plan.maxInboxes,
        dailyRefill: plan.dailyRefill,
        updatedAt: now,
      })
      .where(eq(usersTable.id, userId));

    await tx.insert(creditTransactionsTable).values({
      userId,
      type: "credit",
      amount: plan.credits,
      description: `${plan.name} plan subscription — ${plan.credits.toLocaleString()} credits`,
      balanceAfter: plan.credits,
    });

    const existingSub = await tx
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId));
    if (existingSub.length > 0) {
      await tx
        .update(subscriptionsTable)
        .set({
          planId,
          status: "active",
          stripeSubscriptionId:
            stripeSubscriptionId || existingSub[0].stripeSubscriptionId,
          currentPeriodEnd: planExpiry,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionsTable.userId, userId));
    } else {
      await tx.insert(subscriptionsTable).values({
        userId,
        planId,
        status: "active",
        stripeSubscriptionId: stripeSubscriptionId || null,
        currentPeriodEnd: planExpiry,
      });
    }
  });
}

// Build Stripe checkout URL (or fallback if no Stripe key)
router.post("/checkout", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const auth = getAuth(req);
    const user = await getOrCreateUser(
      clerkId,
      (auth?.sessionClaims?.email as string) || "",
      "",
    );
    const { type, planId, creditPackId } = req.body;
    const stripe = await getStripe();

    if (!stripe) {
      res.json({ url: "/credits?error=stripe_not_configured" });
      return;
    }

    const origin = getAppUrl();
    const successUrl = `${origin}/credits?success=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/credits?error=payment_cancelled`;

    if (type === "credits" && creditPackId) {
      const pack = CREDIT_PACKS.find((p) => p.id === creditPackId);
      if (!pack) {
        res.status(400).json({ error: "Invalid credit pack" });
        return;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: pack.currency,
              unit_amount: pack.price,
              product_data: {
                name: `TempNest ${pack.name} — ${pack.credits} Credits`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: String(user.id),
          type: "credits",
          creditPackId,
          credits: String(pack.credits),
        },
        customer_email: user.email ?? undefined,
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

      res.json({ url: session.url });
      return;
    }

    if (type === "subscription" && planId) {
      const plan = PLANS.find((p) => p.id === planId);
      if (!plan || !plan.stripePriceId) {
        res.json({ url: "/credits?error=plan_not_configured" });
        return;
      }

      // Prevent downgrades to a lower plan while the current higher plan is still active.
      if (comparePlans(planId, user.currentPlan) < 0 && isPlanActive(user)) {
        res
          .status(400)
          .json({
            error:
              "You cannot downgrade while your current plan is active. You can schedule a downgrade for when it expires, or wait until the current plan ends.",
          });
        return;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId: String(user.id), type: "subscription", planId },
        customer_email: user.email ?? undefined,
      });

      await db.insert(paymentsTable).values({
        userId: user.id,
        stripeSessionId: session.id,
        amount: plan.price / 100,
        currency: plan.currency,
        type: "subscription",
        planId,
        status: "pending",
      });

      res.json({ url: session.url });
      return;
    }

    res.status(400).json({ error: "Invalid checkout request" });
  } catch (err) {
    req.log.error({ err }, "Failed to create checkout session");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/verify-session", requireAuth, async (req, res) => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      res.status(400).json({ error: "Stripe not configured" });
      return;
    }

    const clerkId = (req as any).clerkId;
    const auth = getAuth(req);
    const user = await getOrCreateUser(
      clerkId,
      (auth?.sessionClaims?.email as string) || "",
      "",
    );

    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      res.status(400).json({ error: "Missing session_id" });
      return;
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.stripeSessionId, sessionId));

    if (!payment) {
      res.status(404).json({ error: "Payment session not found" });
      return;
    }
    if (payment.userId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      res.status(400).json({ error: "Payment not completed" });
      return;
    }

    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const currency = session.currency || "usd";

    if (payment.type === "credits" && payment.creditsGranted) {
      await applyCreditPurchase(
        user.id,
        payment.creditsGranted,
        sessionId,
        amount,
        currency,
      );
      res.json({
        success: true,
        type: "credits",
        credits: payment.creditsGranted,
      });
    } else if (payment.type === "subscription" && payment.planId) {
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;
      let currentPeriodEnd: Date | null = null;
      let stripeSubId: string | null = subscriptionId;
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = (sub as any).current_period_end;
          currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;
          stripeSubId = (sub as any).id;
        } catch (_) {}
      }
      await applySubscription(
        user.id,
        payment.planId,
        sessionId,
        amount,
        currency,
        stripeSubId,
        currentPeriodEnd,
      );
      res.json({ success: true, type: "subscription", planId: payment.planId });
    } else {
      res.status(400).json({ error: "Unknown payment type" });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to verify session");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const auth = getAuth(req);
    const user = await getOrCreateUser(
      clerkId,
      (auth?.sessionClaims?.email as string) || "",
      "",
    );

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.userId, user.id))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(100);

    res.json(
      payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        type: p.type,
        planId: p.planId,
        creditPackId: p.creditPackId,
        creditsGranted: p.creditsGranted,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list payment history");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      res.json({ received: true });
      return;
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-05-27.dahlia",
    });

    const sig = req.headers["stripe-signature"] as string;
    const payload = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : req.body;
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (_) {
      res.status(400).json({ error: "Webhook signature failed" });
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      if (session.payment_status !== "paid") {
        res.json({ received: true });
        return;
      }

      const { userId, type, credits, planId } = session.metadata || {};
      const uid = Number(userId);
      if (!uid || isNaN(uid)) {
        res.json({ received: true });
        return;
      }

      const amount = session.amount_total ? session.amount_total / 100 : 0;
      const currency = session.currency || "usd";

      // Prefer the pending payment record we created at checkout for type/user safety.
      const [payment] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.stripeSessionId, session.id));

      const finalType = payment?.type || type;
      const finalCredits =
        payment?.creditsGranted || (credits ? Number(credits) : null);
      const finalPlanId = payment?.planId || planId;
      const finalUserId = payment?.userId || uid;

      if (finalType === "credits" && finalCredits) {
        await applyCreditPurchase(
          finalUserId,
          finalCredits,
          session.id,
          amount,
          currency,
        );
      } else if (finalType === "subscription" && finalPlanId) {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;
        let currentPeriodEnd: Date | null = null;
        let stripeSubId: string | null = subscriptionId;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const periodEnd = (sub as any).current_period_end;
            currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;
            stripeSubId = (sub as any).id;
          } catch (_) {}
        }
        await applySubscription(
          finalUserId,
          finalPlanId,
          session.id,
          amount,
          currency,
          stripeSubId,
          currentPeriodEnd,
        );
      }
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Webhook error");
    res.status(500).json({ error: "Webhook error" });
  }
});

export default router;
