import { Router } from "express";
import {
  db,
  usersTable,
  inboxesTable,
  emailsTable,
  otpRecordsTable,
  creditTransactionsTable,
} from "@workspace/db";
import { eq, and, gte, count, sum, desc } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      (req as any).firebaseName || "",
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [inboxCount] = await db
      .select({ count: count() })
      .from(inboxesTable)
      .where(
        and(eq(inboxesTable.userId, user.id), eq(inboxesTable.isActive, true)),
      );

    const [emailsToday] = await db
      .select({ count: count() })
      .from(emailsTable)
      .where(
        and(
          eq(emailsTable.userId, user.id),
          gte(emailsTable.receivedAt, today),
        ),
      );

    const [otpsToday] = await db
      .select({ count: count() })
      .from(otpRecordsTable)
      .where(
        and(
          eq(otpRecordsTable.userId, user.id),
          gte(otpRecordsTable.extractedAt, today),
        ),
      );

    // Credits used today (debit transactions)
    const todayTxns = await db
      .select()
      .from(creditTransactionsTable)
      .where(
        and(
          eq(creditTransactionsTable.userId, user.id),
          gte(creditTransactionsTable.createdAt, today),
        ),
      );
    const creditsUsedToday = todayTxns
      .filter((t) => t.type === "debit")
      .reduce((acc, t) => acc + t.amount, 0);

    // Recent emails (last 5)
    const recentEmails = await db
      .select()
      .from(emailsTable)
      .where(eq(emailsTable.userId, user.id))
      .orderBy(desc(emailsTable.receivedAt))
      .limit(5);

    res.json({
      credits: user.credits,
      maxCredits: user.maxCredits,
      inboxCount: Number(inboxCount?.count || 0),
      maxInboxes: user.maxInboxes,
      emailsToday: Number(emailsToday?.count || 0),
      otpsExtracted: Number(otpsToday?.count || 0),
      creditsUsedToday: creditsUsedToday,
      recentEmails: recentEmails.map((e) => ({
        id: e.id,
        inboxId: e.inboxId,
        from: e.fromAddress,
        subject: e.subject,
        preview: e.preview,
        isRead: e.isRead,
        hasOtp: e.hasOtp,
        otpCode: e.otpCode,
        createdAt: e.receivedAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
