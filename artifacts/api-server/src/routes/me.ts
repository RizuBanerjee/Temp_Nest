import { Router } from "express";
import {
  db,
  usersTable,
  creditTransactionsTable,
  inboxesTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { PLANS } from "./plans";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid as string;
    const email = ((req as any).firebaseEmail as string) || "";
    const name = ((req as any).firebaseName as string) || "";

    let user = await getOrCreateUser(firebaseUid, email, name);

    // If the DB email is missing and we now have a real one, update it.
    const isDbPlaceholder = !user.email;
    if (email && isDbPlaceholder && email !== user.email) {
      try {
        const existing = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.email, email));
        if (existing.length > 0 && existing[0].id !== user.id) {
          req.log.warn(
            { email, userId: user.id },
            "Email already belongs to another account; keeping current",
          );
        } else {
          await db
            .update(usersTable)
            .set({ email, updatedAt: new Date() })
            .where(eq(usersTable.id, user.id));
          user.email = email;
        }
      } catch (err: any) {
        req.log.warn(
          { err, email, userId: user.id },
          "Could not update email; keeping current",
        );
      }
    }

    const now = new Date();
    let currentPlan = user.currentPlan;
    let nextPlan = user.nextPlan;
    let planStartDate = user.planStartDate;
    let planExpiryDate = user.planExpiryDate;
    let planRenewalReminder = false;

    // Apply any scheduled downgrade (or free fallback) once the current paid plan expires.
    if (planExpiryDate && planExpiryDate.getTime() <= now.getTime()) {
      const fallbackPlan = nextPlan || "free";
      const planConfig = PLANS.find((p) => p.id === fallbackPlan) || PLANS[0];
      const [updated] = await db
        .update(usersTable)
        .set({
          currentPlan: fallbackPlan as any,
          nextPlan: null,
          planStartDate: now,
          planExpiryDate: null,
          planRenewalReminderSentAt: null,
          credits: planConfig.credits,
          maxCredits: planConfig.maxCredits,
          maxInboxes: planConfig.maxInboxes,
          dailyRefill: planConfig.dailyRefill,
          updatedAt: now,
        })
        .where(eq(usersTable.id, user.id))
        .returning();
      if (updated) {
        user = updated;
        currentPlan = updated.currentPlan;
        nextPlan = updated.nextPlan;
        planStartDate = updated.planStartDate;
        planExpiryDate = updated.planExpiryDate;
      }
    } else if (planExpiryDate) {
      // In-app reminder once per week when the paid plan is about to expire.
      const daysUntilExpiry =
        (planExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const reminderThreshold = 7;
      const reminderAlreadySent =
        user.planRenewalReminderSentAt &&
        now.getTime() - user.planRenewalReminderSentAt.getTime() <
          7 * 24 * 60 * 60 * 1000;
      if (daysUntilExpiry <= reminderThreshold && !reminderAlreadySent) {
        planRenewalReminder = true;
        await db
          .update(usersTable)
          .set({ planRenewalReminderSentAt: now })
          .where(eq(usersTable.id, user.id));
      }
    }

    // Daily credit refill logic.
    const refillBasis = user.lastRefillAt || user.createdAt;
    const hoursSince =
      (now.getTime() - refillBasis.getTime()) / (1000 * 60 * 60);
    const shouldRefill = hoursSince >= 24;

    if (shouldRefill && user.credits < user.maxCredits) {
      const newCredits = Math.min(
        user.credits + user.dailyRefill,
        user.maxCredits,
      );
      const refillAmount = newCredits - user.credits;
      if (refillAmount > 0) {
        await db
          .update(usersTable)
          .set({ credits: newCredits, lastRefillAt: now, updatedAt: now })
          .where(eq(usersTable.id, user.id));
        await db.insert(creditTransactionsTable).values({
          userId: user.id,
          type: "refill",
          amount: refillAmount,
          description: "Daily credit refill",
          balanceAfter: newCredits,
        });
        user.credits = newCredits;
        user.lastRefillAt = now;
      }
    }

    const [inboxCount] = await db
      .select({ count: count() })
      .from(inboxesTable)
      .where(eq(inboxesTable.userId, user.id));

    res.json({
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      currentPlan,
      nextPlan,
      planStartDate: planStartDate?.toISOString() ?? null,
      planExpiryDate: planExpiryDate?.toISOString() ?? null,
      planRenewalReminder,
      credits: user.credits,
      maxCredits: user.maxCredits,
      dailyRefill: user.dailyRefill,
      activeInboxCount: Number(inboxCount?.count || 0),
      maxInboxes: user.maxInboxes,
      status: user.status,
      isAdmin: user.isAdmin,
      notifyNewEmail: user.notifyNewEmail,
      notifyOtp: user.notifyOtp,
      notifyLowCredits: user.notifyLowCredits,
      notifyWeeklySummary: user.notifyWeeklySummary,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid as string;
    const { name } = req.body;

    const [user] = await db
      .update(usersTable)
      .set({ name: name || "", updatedAt: new Date() })
      .where(eq(usersTable.firebaseUid, firebaseUid))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      currentPlan: user.currentPlan,
      nextPlan: user.nextPlan,
      planStartDate: user.planStartDate?.toISOString() ?? null,
      planExpiryDate: user.planExpiryDate?.toISOString() ?? null,
      planRenewalReminder: false,
      credits: user.credits,
      maxCredits: user.maxCredits,
      dailyRefill: user.dailyRefill,
      activeInboxCount: 0,
      maxInboxes: user.maxInboxes,
      status: user.status,
      isAdmin: user.isAdmin,
      notifyNewEmail: user.notifyNewEmail,
      notifyOtp: user.notifyOtp,
      notifyLowCredits: user.notifyLowCredits,
      notifyWeeklySummary: user.notifyWeeklySummary,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notifications", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid as string;
    const { notifyNewEmail, notifyOtp, notifyLowCredits, notifyWeeklySummary } =
      req.body;

    const updates: Partial<typeof usersTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof notifyNewEmail === "boolean")
      updates.notifyNewEmail = notifyNewEmail;
    if (typeof notifyOtp === "boolean") updates.notifyOtp = notifyOtp;
    if (typeof notifyLowCredits === "boolean")
      updates.notifyLowCredits = notifyLowCredits;
    if (typeof notifyWeeklySummary === "boolean")
      updates.notifyWeeklySummary = notifyWeeklySummary;

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.firebaseUid, firebaseUid))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      notifyNewEmail: user.notifyNewEmail,
      notifyOtp: user.notifyOtp,
      notifyLowCredits: user.notifyLowCredits,
      notifyWeeklySummary: user.notifyWeeklySummary,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
