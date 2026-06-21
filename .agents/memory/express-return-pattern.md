---
name: Express return pattern
description: Async Express 5 handlers must not use "return res.json()" — split into two statements to avoid TS7030
---

In async Express 5 route handlers, `return res.json(...)` causes TS7030 "Not all code paths return a value" because `res.json()` returns `void` in some Express type definitions.

**Rule:** Always split into two statements:
```typescript
res.json({ ... });
return;
```
or for early returns:
```typescript
res.status(404).json({ error: "Not found" }); return;
```

**Why:** Express 5 types `res.json()` as returning `Response` but TypeScript sees the async handler return type as `Promise<void>`, leading to type conflicts with `return res.json()`.
