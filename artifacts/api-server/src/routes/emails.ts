import { Router } from "express";
import { db, emailsTable, inboxesTable, otpRecordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { extractOtp } from "../lib/mailtm";

const router = Router();

router.get("/:emailId", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid as string;
    const emailId = req.params.emailId as string;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      "",
    );

    const [email] = await db
      .select()
      .from(emailsTable)
      .where(and(eq(emailsTable.id, emailId), eq(emailsTable.userId, user.id)));
    if (!email) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      id: email.id,
      inboxId: email.inboxId,
      from: email.fromAddress,
      subject: email.subject,
      bodyText: email.bodyText,
      bodyHtml: email.bodyHtml,
      isRead: email.isRead,
      hasOtp: email.hasOtp,
      otpCode: email.otpCode,
      createdAt: email.receivedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get email");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:emailId/read", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid as string;
    const emailId = req.params.emailId as string;
    const { isRead } = req.body;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      "",
    );

    const [email] = await db
      .update(emailsTable)
      .set({ isRead: Boolean(isRead) })
      .where(and(eq(emailsTable.id, emailId), eq(emailsTable.userId, user.id)))
      .returning();

    if (!email) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      id: email.id,
      inboxId: email.inboxId,
      from: email.fromAddress,
      subject: email.subject,
      preview: email.preview,
      isRead: email.isRead,
      hasOtp: email.hasOtp,
      otpCode: email.otpCode,
      createdAt: email.receivedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to mark email read");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:emailId/otp", requireAuth, async (req, res) => {
  try {
    const firebaseUid = (req as any).firebaseUid as string;
    const emailId = req.params.emailId as string;
    const user = await getOrCreateUser(
      firebaseUid,
      (req as any).firebaseEmail || "",
      "",
    );

    const [email] = await db
      .select()
      .from(emailsTable)
      .where(and(eq(emailsTable.id, emailId), eq(emailsTable.userId, user.id)));
    if (!email) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (email.hasOtp && email.otpCode) {
      res.json({
        found: true,
        code: email.otpCode,
        length: email.otpCode.length,
      });
      return;
    }

    const text = email.bodyText || email.preview || "";
    const code = extractOtp(text);

    if (code) {
      await db
        .update(emailsTable)
        .set({ hasOtp: true, otpCode: code })
        .where(eq(emailsTable.id, emailId));
      const existing = await db
        .select()
        .from(otpRecordsTable)
        .where(eq(otpRecordsTable.emailId, emailId))
        .limit(1);
      if (!existing[0]) {
        await db
          .insert(otpRecordsTable)
          .values({ emailId, userId: user.id, code, length: code.length });
      }
    }

    res.json({
      found: !!code,
      code: code ?? null,
      length: code ? code.length : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to extract OTP");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
