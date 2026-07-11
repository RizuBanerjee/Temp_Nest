---
name: Clerk account merge order
description: Safe order of operations when merging a placeholder Clerk session into an existing canonical email row.
---

When the same person signs in with a new Clerk id and a verified email that already belongs to a different DB row, the app should resolve to the canonical email row. Because `users.clerk_id` is unique, you cannot simply update the canonical row's `clerk_id` to the new value while the old placeholder row still holds that same `clerk_id`.

**Rule:** delete the duplicate (placeholder) session row **before** updating the canonical row's `clerk_id` to the new session id. Then return the canonical row.

**Why:** a row always exists with the current session's `clerk_id`. Updating another row to that same `clerk_id` violates `users_clerk_id_unique` and produces the 500 seen in production (`duplicate key value violates unique constraint "users_clerk_id_unique"`).

**How to apply:** in `getOrCreateUser`, look up the current session row first, then the canonical email row. If both exist and differ, `DELETE` the session row, then `UPDATE` the canonical row with the new `clerk_id`. Related tables use `onDelete: "cascade"`, so the placeholder's data is cleaned up automatically. If you need to preserve data from the duplicate row, migrate it before the delete.
