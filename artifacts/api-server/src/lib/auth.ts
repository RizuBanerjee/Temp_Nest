import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      })
    : getApps()[0];

export const firebaseAuth = getAuth(firebaseApp);

export type AuthContext = {
  firebaseUid: string;
  firebaseEmail: string;
  firebaseName: string;
  dbUser?: typeof usersTable.$inferSelect;
};

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

export async function decodeAuthToken(
  req: Request,
): Promise<DecodedIdToken | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  try {
    return await firebaseAuth.verifyIdToken(token);
  } catch (err) {
    return null;
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    (req as any).firebaseUid = decoded.uid;
    (req as any).firebaseEmail = decoded.email || "";
    (req as any).firebaseName = decoded.name || "";
    next();
  } catch (err) {
    req.log?.warn({ err }, "Invalid Firebase ID token");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
};

export const requireActiveUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.firebaseUid, decoded.uid))
      .limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.status !== "active") {
      res
        .status(403)
        .json({
          error: "Account suspended. Please contact support.",
          code: "ACCOUNT_SUSPENDED",
        });
      return;
    }
    (req as any).firebaseUid = decoded.uid;
    (req as any).firebaseEmail = decoded.email || "";
    (req as any).firebaseName = decoded.name || "";
    (req as any).dbUser = user;
    next();
  } catch (err) {
    req.log?.warn({ err }, "Invalid Firebase ID token");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.firebaseUid, decoded.uid))
      .limit(1);
    if (!user || !user.isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as any).firebaseUid = decoded.uid;
    (req as any).firebaseEmail = decoded.email || "";
    (req as any).firebaseName = decoded.name || "";
    (req as any).dbUser = user;
    next();
  } catch (err) {
    req.log?.warn({ err }, "Invalid Firebase ID token");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
};

export const getOrCreateUser = async (
  firebaseUid: string,
  email: string,
  name: string,
) => {
  // A real email is used as the canonical identity key. Anything else (missing
  // or empty) is treated as unknown so we never store a placeholder string.
  const isPlaceholder = !email;
  const realEmail = isPlaceholder ? null : email;

  // 1. Look up the row already tied to this Firebase session.
  let [currentUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.firebaseUid, firebaseUid))
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
          // (usually a placeholder) and rebind the Firebase uid to the canonical row.
          // Related data cascades on delete; if you need to preserve data from
          // the duplicate row, migrate it here before deleting.
          await db.delete(usersTable).where(eq(usersTable.id, currentUser.id));
          await db
            .update(usersTable)
            .set({ firebaseUid, updatedAt: new Date() })
            .where(eq(usersTable.id, emailOwner.id));
          emailOwner.firebaseUid = firebaseUid;
          return emailOwner;
        }
        // No other owner: update this row with the real email.
        // Keep the existing display name; it is managed by the user in Settings, not synced from Firebase.
        await db
          .update(usersTable)
          .set({
            email: realEmail,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, currentUser.id));
        currentUser.email = realEmail;
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
        .set({ firebaseUid, updatedAt: new Date() })
        .where(eq(usersTable.id, emailOwner.id));
      emailOwner.firebaseUid = firebaseUid;
      return emailOwner;
    }
  }

  // 3. Create a new user with a NULL email when none is provided.
  try {
    const [newUser] = await db
      .insert(usersTable)
      .values({
        firebaseUid,
        email: realEmail,
        name:
          name || (realEmail ? realEmail.split("@")[0] : firebaseUid.slice(-8)),
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
        .where(eq(usersTable.firebaseUid, firebaseUid))
        .limit(1);
      if (retry[0]) return retry[0];
    }
    throw err;
  }
};
