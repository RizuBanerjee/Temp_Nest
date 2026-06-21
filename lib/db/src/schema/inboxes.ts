import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const inboxesTable = pgTable("inboxes", {
  id: text("id").primaryKey(), // mail.tm account ID
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  address: text("address").notNull().unique(),
  domain: text("domain").notNull(),
  password: text("password").notNull(), // encrypted mail.tm password
  mailtmToken: text("mailtm_token"), // cached JWT token from mail.tm
  isActive: boolean("is_active").notNull().default(true),
  isPriority: boolean("is_priority").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInboxSchema = createInsertSchema(inboxesTable).omit({ createdAt: true });
export type InsertInbox = z.infer<typeof insertInboxSchema>;
export type Inbox = typeof inboxesTable.$inferSelect;
