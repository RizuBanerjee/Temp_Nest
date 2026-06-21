import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { emailsTable } from "./emails";
import { usersTable } from "./users";

export const otpRecordsTable = pgTable("otp_records", {
  id: serial("id").primaryKey(),
  emailId: text("email_id").notNull().references(() => emailsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  length: integer("length").notNull(),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
});

export const insertOtpRecordSchema = createInsertSchema(otpRecordsTable).omit({ id: true, extractedAt: true });
export type InsertOtpRecord = z.infer<typeof insertOtpRecordSchema>;
export type OtpRecord = typeof otpRecordsTable.$inferSelect;
