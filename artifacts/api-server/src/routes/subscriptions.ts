import { Router } from "express";
import { db, usersTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/current", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const auth = getAuth(req);
    const user = await getOrCreateUser(clerkId, (auth?.sessionClaims?.email as string) || "", "");

    const [sub] = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, user.id));

    if (!sub) {
      res.json({
        planId: "free",
        planName: "Free",
        status: "free",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
      return;
    }

    const planNames: Record<string, string> = { free: "Free", pro: "Pro", business: "Business" };

    res.json({
      planId: sub.planId,
      planName: planNames[sub.planId] || sub.planId,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd === "true",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
