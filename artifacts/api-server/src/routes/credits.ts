import { Router } from "express";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      (req as any).firebaseName || "",
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
      (req as any).firebaseName || "",
    );

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string, 10) || 10),
    );
    const type = (req.query.type as string) || "all";
    const search = (req.query.search as string) || "";
    const sort = (req.query.sort as string) === "asc" ? "asc" : "desc";

    const conditions: (ReturnType<typeof eq> | undefined)[] = [
      eq(creditTransactionsTable.userId, user.id),
    ];

    if (type !== "all") {
      conditions.push(eq(creditTransactionsTable.type, type as any));
    }

    if (search.trim()) {
      const searchDate = new Date(search.trim());
      if (!isNaN(searchDate.getTime())) {
        const start = new Date(searchDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(searchDate);
        end.setHours(23, 59, 59, 999);
        const dateRange = and(
          gte(creditTransactionsTable.createdAt, start),
          lte(creditTransactionsTable.createdAt, end),
        );
        if (dateRange) conditions.push(dateRange);
      } else {
        conditions.push(
          sql`lower(${creditTransactionsTable.description}) like ${"%" + search.trim().toLowerCase() + "%"}`,
        );
      }
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(creditTransactionsTable)
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const txns = await db
      .select()
      .from(creditTransactionsTable)
      .where(whereClause)
      .orderBy(
        sort === "asc"
          ? asc(creditTransactionsTable.createdAt)
          : desc(creditTransactionsTable.createdAt),
      )
      .limit(limit)
      .offset(offset);

    res.json({
      data: txns.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list credit transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;