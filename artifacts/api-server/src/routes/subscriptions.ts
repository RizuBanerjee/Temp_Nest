import { Router } from "express";
import { db, usersTable, subscriptionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { comparePlans, PLANS } from "./plans";

const router = Router();

const planNames: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

router.get("/current", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      "",
    );

    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, user.id));

    res.json({
      planId: user.currentPlan,
      planName: planNames[user.currentPlan] || user.currentPlan,
      nextPlanId: user.nextPlan,
      nextPlanName: user.nextPlan
        ? planNames[user.nextPlan] || user.nextPlan
        : null,
      status: sub?.status || (user.currentPlan === "free" ? "free" : "active"),
      currentPeriodEnd: user.planExpiryDate?.toISOString() ?? null,
      planStartDate: user.planStartDate?.toISOString() ?? null,
      planExpiryDate: user.planExpiryDate?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd === "true" || false,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Schedule a downgrade to a lower plan. The downgrade is applied when the current plan expires.
router.post("/schedule-downgrade", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid;
    const { planId } = req.body;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      "",
    );

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }
    if (comparePlans(planId, user.currentPlan) >= 0) {
      res
        .status(400)
        .json({ error: "You can only schedule a downgrade to a lower plan" });
      return;
    }
    if (user.currentPlan === "free" || !user.planExpiryDate) {
      res.status(400).json({ error: "No active paid plan to downgrade from" });
      return;
    }

    await db
      .update(usersTable)
      .set({ nextPlan: planId as any, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));

    res.json({
      success: true,
      currentPlanId: user.currentPlan,
      nextPlanId: planId,
      planExpiryDate: user.planExpiryDate.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to schedule downgrade");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
