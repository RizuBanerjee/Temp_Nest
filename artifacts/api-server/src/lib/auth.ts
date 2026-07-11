import { getAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).clerkId = clerkId;
  next();
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  if (!user[0] || !user[0].isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  (req as any).clerkId = clerkId;
  (req as any).dbUser = user[0];
  next();
};

export const getOrCreateUser = async (
  clerkId: string,
  email: string,
  name: string,
) => {
  // A real email is used as the canonical identity key. Anything else (missing,
  // empty, or a placeholder) is treated as unknown so we never store a Clerk id
  // in the email column.
  const isPlaceholder = !email || email.includes("@noemail.tempnest.internal");
  const realEmail = isPlaceholder ? null : email;

  // 1. Look up the row already tied to this Clerk session.
  let [currentUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);

  if (currentUser) {
    if (realEmail) {
      if (currentUser.email !== realEmail) {
        const [emailOwner] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, realEmail))
          .limit(1);
        if (emailOwner && emailOwner.id !== currentUser.id) {
          // Canonical account already exists. Remove the duplicate session row
          // (usually a placeholder) and rebind the Clerk id to the canonical row.
          // Related data cascades on delete; if you need to preserve data from
          // the duplicate row, migrate it here before deleting.
          await db.delete(usersTable).where(eq(usersTable.id, currentUser.id));
          await db
            .update(usersTable)
            .set({ clerkId, updatedAt: new Date() })
            .where(eq(usersTable.id, emailOwner.id));
          emailOwner.clerkId = clerkId;
          return emailOwner;
        }
        // No other owner: update this row with the real email.
        await db
          .update(usersTable)
          .set({
            email: realEmail,
            name: name || currentUser.name,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, currentUser.id));
        currentUser.email = realEmail;
        if (name) currentUser.name = name;
      } else if (name && name !== currentUser.name) {
        await db
          .update(usersTable)
          .set({ name, updatedAt: new Date() })
          .where(eq(usersTable.id, currentUser.id));
        currentUser.name = name;
      }
    }
    return currentUser;
  }

  // 2. No current row. If we have a real email, prefer the canonical account.
  if (realEmail) {
    const [emailOwner] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, realEmail))
      .limit(1);
    if (emailOwner) {
      await db
        .update(usersTable)
        .set({ clerkId, updatedAt: new Date() })
        .where(eq(usersTable.id, emailOwner.id));
      emailOwner.clerkId = clerkId;
      return emailOwner;
    }
  }

  // 3. Create a new user with a NULL email when none is provided.
  try {
    const [newUser] = await db
      .insert(usersTable)
      .values({
        clerkId,
        email: realEmail,
        name: name || (realEmail ? realEmail.split("@")[0] : clerkId.slice(-8)),
        currentPlan: "free",
        credits: 50,
        maxCredits: 50,
        dailyRefill: 20,
        maxInboxes: 1,
        status: "active",
        isAdmin: false,
        lastRefillAt: new Date(),
      })
      .returning();
    return newUser;
  } catch (err: any) {
    if (
      err?.message?.includes("unique constraint") ||
      err?.message?.includes("duplicate key")
    ) {
      const retry = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, clerkId))
        .limit(1);
      if (retry[0]) return retry[0];
    }
    throw err;
  }
};
