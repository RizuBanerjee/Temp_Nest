import { Router } from "express";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const auth = getAuth(req);
    const user = await getOrCreateUser(clerkId, (auth?.sessionClaims?.email as string) || "", "");

    res.json({
      balance: user.credits,
      maxBalance: user.maxCredits,
      dailyRefill: user.dailyRefill,
      lastRefillAt: user.lastRefillAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get credits");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const auth = getAuth(req);
    const user = await getOrCreateUser(clerkId, (auth?.sessionClaims?.email as string) || "", "");

    const txns = await db.select().from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.userId, user.id))
      .orderBy(desc(creditTransactionsTable.createdAt))
      .limit(100);

    res.json(txns.map(t => ({
      id: t.id, type: t.type, amount: t.amount,
      description: t.description, balanceAfter: t.balanceAfter,
      createdAt: t.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list credit transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
