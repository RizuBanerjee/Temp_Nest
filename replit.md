# TempNest

Temporary email SaaS platform with credit-based usage, free/pro/business plans, admin dashboard, Firebase auth, Stripe payments, Mail.tm email integration, and OTP extraction.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080 → proxied at `/api`)
- `pnpm --filter @workspace/tempnest run dev` — run the React frontend (port → proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env (frontend): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- Required env (backend): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Optional env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — for payments
- Required env: `SESSION_SECRET` — set via Replit secrets

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + wouter routing + TanStack Query
- API: Express 5
- Auth: Firebase Auth (email/password + Google sign-in)
- DB: PostgreSQL + Drizzle ORM
- Payments: Stripe v22 (`apiVersion: "2026-05-27.dahlia"`)
- Email: Mail.tm API (no key needed)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Charts: Recharts

## Where things live

- `lib/db/src/schema/` — all DB schemas (users, inboxes, emails, credits, otps, payments, subscriptions)
- `artifacts/api-server/src/routes/` — all API routes (me, inboxes, emails, credits, plans, subscriptions, dashboard, analytics, payments, admin)
- `artifacts/api-server/src/lib/auth.ts` — Firebase token verification, requireAuth, requireAdmin, getOrCreateUser
- `artifacts/api-server/src/lib/mailtm.ts` — Mail.tm client + OTP extractor
- `artifacts/tempnest/src/pages/` — all frontend pages
- `artifacts/tempnest/src/components/layout/` — MainLayout (sidebar), PublicLayout
- `artifacts/tempnest/src/lib/firebase.ts` — Firebase app config
- `artifacts/tempnest/src/lib/auth-context.tsx` — Firebase auth state and sign-in helpers
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks + Zod schemas used everywhere
- Credit deduction on server: all credit costs enforced server-side, never trust client
- Mail.tm fallback: if Mail.tm account creation fails, inbox is created with `local_` prefix and gracefully handles no remote sync
- Stripe: graceful no-op if `STRIPE_SECRET_KEY` not set (returns error URL instead of crashing)
- `req.params` values always cast with `as string` before Drizzle `eq()` calls to avoid TS2769 overload errors
- Frontend sends Firebase ID token as `Authorization: Bearer <token>` on every API call; backend verifies it with `firebase-admin`

## Product

- Temporary email inboxes via Mail.tm integration
- Credit wallet with daily refill (free: 20/day, pro: 1000/mo, business: 5000/mo)
- OTP detection and extraction from emails
- Dashboard with recent emails, credit bar, stats
- Analytics with 30-day charts (Recharts)
- Admin dashboard: user management, inbox management, revenue analytics
- Pricing page: Free/$0, Pro/$9.99/mo, Business/$29.99/mo

## Credit Costs

- Create inbox: 2 credits base
- Custom inbox name: +5 credits
- Priority inbox: +10 credits
- Refresh inbox: 1 credit
- Receive email: 1 credit

## Gotchas

- Always run `pnpm run typecheck:libs` after schema changes before API server typecheck
- `req.params.X` in Express returns `string | ParsedQs | ...` — always cast with `as string` for Drizzle
- Stripe API version must match: `"2026-05-27.dahlia"`
- Logo component is itself a Link — don't wrap it in another Link
- `FIREBASE_PRIVATE_KEY` must have literal newlines; if the secret comes with `\n`, the backend replaces them at runtime
- Existing Clerk users were removed when switching to Firebase; users must sign up again

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
