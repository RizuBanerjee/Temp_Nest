import { Router } from "express";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      "",
    );

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
    const firebaseUid = (req as any).firebaseUid;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      "",
    );

    const txns = await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.userId, user.id))
      .orderBy(desc(creditTransactionsTable.createdAt))
      .limit(100);

    res.json(
      txns.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list credit transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
