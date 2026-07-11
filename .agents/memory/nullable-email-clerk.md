---
name: Nullable email for Clerk users
description: Why the users.email column is nullable and how to handle missing emails from Clerk social logins.
---

`users.email` has a UNIQUE constraint. If a social login doesn't expose an email, do **not** insert a placeholder string (e.g. `clerkId@noemail.tempnest.internal`) to satisfy a NOT NULL constraint. Placeholder strings are not real emails, pollute the unique index, and create duplicate-looking rows when the same person signs in later with a real email.

**Rule:** make `email` nullable (`text("email").unique()`), and insert `NULL` when Clerk provides no verified email. `clerk_id` remains the unique session identifier. The app can display a fallback for missing emails in the UI.

**Why:** placeholder emails hide duplicates, make the admin user list confusing, and cause the DB to store Clerk ids in the email column.

**How to apply:** update the Drizzle schema, regenerate/push migrations, and change any `getOrCreateUser` logic that falls back to a placeholder email. Use `email ?? undefined` when passing to external services that don't accept null (e.g. Stripe `customer_email`).
