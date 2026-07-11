---
name: TypeScript composite declarations in shared workspace
description: Rebuild declaration outputs after changing a shared schema package so dependent packages typecheck correctly.
---

Workspace packages such as `@workspace/db` are configured as TypeScript composite projects (`composite: true`, `emitDeclarationOnly: true`) and emit `.d.ts` files to `dist`. Dependent packages reference them via `tsconfig.json` `references` and read those emitted declarations during `tsc --noEmit`.

**Rule:** after changing a shared schema (or any composite package source), run `tsc -p <package>/tsconfig.json` to rebuild its declarations before typechecking dependents.

**Why:** `tsc -p tsconfig.json --noEmit` for a dependent project does not rebuild referenced projects. It reads the stale `dist/*.d.ts` files, causing type errors that look like the new schema change was ignored (e.g. "Type 'string | null' is not assignable to type 'string'").

**How to apply:** for schema changes, run `cd /home/runner/workspace && tsc -p lib/db/tsconfig.json` before `pnpm --filter @workspace/api-server run typecheck`.
