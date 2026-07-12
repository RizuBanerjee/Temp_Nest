import { Router } from "express";
import {
  db,
  emailsTable,
  inboxesTable,
  otpRecordsTable,
  creditTransactionsTable,
} from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/usage", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      "",
    );

    // Last 30 days
    const days: Record<
      string,
      {
        emailsReceived: number;
        inboxesCreated: number;
        creditsUsed: number;
        otpsExtracted: number;
      }
    > = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split("T")[0];
      days[key] = {
        emailsReceived: 0,
        inboxesCreated: 0,
        creditsUsed: 0,
        otpsExtracted: 0,
      };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    const emails = await db
      .select()
      .from(emailsTable)
      .where(
        and(
          eq(emailsTable.userId, user.id),
          gte(emailsTable.receivedAt, startDate),
        ),
      );
    emails.forEach((e) => {
      const key = e.receivedAt.toISOString().split("T")[0];
      if (days[key]) days[key].emailsReceived++;
    });

    const inboxes = await db
      .select()
      .from(inboxesTable)
      .where(
        and(
          eq(inboxesTable.userId, user.id),
          gte(inboxesTable.createdAt, startDate),
        ),
      );
    inboxes.forEach((i) => {
      const key = i.createdAt.toISOString().split("T")[0];
      if (days[key]) days[key].inboxesCreated++;
    });

    const otps = await db
      .select()
      .from(otpRecordsTable)
      .where(
        and(
          eq(otpRecordsTable.userId, user.id),
          gte(otpRecordsTable.extractedAt, startDate),
        ),
      );
    otps.forEach((o) => {
      const key = o.extractedAt.toISOString().split("T")[0];
      if (days[key]) days[key].otpsExtracted++;
    });

    const txns = await db
      .select()
      .from(creditTransactionsTable)
      .where(
        and(
          eq(creditTransactionsTable.userId, user.id),
          gte(creditTransactionsTable.createdAt, startDate),
        ),
      );
    txns
      .filter((t) => t.type === "debit")
      .forEach((t) => {
        const key = t.createdAt.toISOString().split("T")[0];
        if (days[key]) days[key].creditsUsed += t.amount;
      });

    const daily = Object.entries(days).map(([date, stats]) => ({
      date,
      ...stats,
    }));

    const [totalEmails] = await db
      .select({ count: count() })
      .from(emailsTable)
      .where(eq(emailsTable.userId, user.id));
    const [totalInboxes] = await db
      .select({ count: count() })
      .from(inboxesTable)
      .where(eq(inboxesTable.userId, user.id));
    const [totalOtps] = await db
      .select({ count: count() })
      .from(otpRecordsTable)
      .where(eq(otpRecordsTable.userId, user.id));
    const allDebits = await db
      .select()
      .from(creditTransactionsTable)
      .where(and(eq(creditTransactionsTable.userId, user.id)));
    const totalCreditsUsed = allDebits
      .filter((t) => t.type === "debit")
      .reduce((a, t) => a + t.amount, 0);

    res.json({
      daily,
      totals: {
        totalEmails: Number(totalEmails?.count || 0),
        totalInboxes: Number(totalInboxes?.count || 0),
        totalCreditsUsed,
        totalOtps: Number(totalOtps?.count || 0),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get analytics");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
