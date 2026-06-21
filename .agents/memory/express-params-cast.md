---
name: Express params cast
description: req.params values in Express are typed as string | ParsedQs | ... causing Drizzle eq() overload errors without explicit cast
---

In Express route handlers, `req.params.X` has type `string | ParsedQs | string[] | ParsedQs[]`. When passed directly to Drizzle's `eq()` function, this causes TS2769 "No overload matches this call" errors.

**Rule:** Always cast route params: `const id = req.params.id as string;`

**Why:** Drizzle `eq()` expects `string | SQLWrapper`, not the broader Express param union type. TypeScript cannot narrow it automatically.

**How to apply:** At the top of every route handler that uses `req.params`, destructure with explicit `as string` casts before any DB query.
