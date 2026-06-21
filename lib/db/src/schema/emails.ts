import { pgTable, text, boolean, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { inboxesTable } from "./inboxes";
import { usersTable } from "./users";

export const emailsTable = pgTable("emails", {
  id: text("id").primaryKey(), // mail.tm message ID
  inboxId: text("inbox_id").notNull().references(() => inboxesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fromAddress: text("from_address").notNull(),
  subject: text("subject").notNull().default("(no subject)"),
  preview: text("preview").notNull().default(""),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  isRead: boolean("is_read").notNull().default(false),
  hasOtp: boolean("has_otp").notNull().default(false),
  otpCode: text("otp_code"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailSchema = createInsertSchema(emailsTable).omit({ createdAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;
