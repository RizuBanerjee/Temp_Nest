# TempNest

A full-stack temporary email SaaS platform with credit-based usage, subscription plans, admin dashboard, OTP extraction, and real-time email syncing via Mail.tm integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Admin Access](#admin-access)
- [Credit System](#credit-system)
- [Pricing Plans](#pricing-plans)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

TempNest provides disposable email addresses via the Mail.tm API. Users can create temporary inboxes, receive emails, extract OTP/verification codes, and manage their email usage through a credit-based system. The platform supports free, pro, and business subscription tiers with Stripe billing, plus a comprehensive admin dashboard for site management.

---

## Features

### Core
- **Temporary Email Inboxes** — Create disposable email addresses via Mail.tm API
- **Real-time Email Sync** — Fetch and display emails with auto-refresh
- **OTP Extraction** — Automatic detection and extraction of verification codes from email content
- **Credit Wallet** — Pay-per-use credit system for creating inboxes and refreshing emails
- **Daily Credit Refill** — Automatic credit replenishment every 24 hours

### User Features
- **Clerk Authentication** — OAuth (Google, GitHub, etc.) and email/password sign-in
- **Dashboard** — Overview of credits, inbox count, recent emails, and stats
- **Analytics** — 30-day usage charts (Recharts)
- **Settings** — Profile, theme (light/dark/system), notification preferences
- **Pricing Page** — Plan comparison and Stripe checkout
- **Credit Purchases** — One-time credit packs via Stripe
- **Subscription Management** — Upgrade/downgrade plans with Stripe billing

### Admin Features
- **Admin Dashboard** — Site overview with user/inbox/email counts
- **User Management** — Search, view, update, and suspend users
- **Inbox Management** — Browse all inboxes across all users
- **Revenue Analytics** — Monthly revenue breakdown and plan distribution
- **Unlimited Everything** — Admin users get unlimited credits, inboxes, and refreshes

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.0 | UI framework |
| Vite | 7.3.2 | Build tool |
| Tailwind CSS | 4.1.14 | Styling |
| shadcn/ui | latest | UI components |
| TanStack Query | 5.90.21 | Data fetching |
| wouter | 3.3.5 | Client routing |
| Clerk | 6.10.4 | Authentication |
| Recharts | 2.15.2 | Charts |
| Framer Motion | 12.23.24 | Animations |
| Zod | 3.25.76 | Validation |
| Sonner | 2.0.7 | Toast notifications |
| Lucide React | 0.545.0 | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 24.x | Runtime |
| Express | 5.2.1 | API framework |
| TypeScript | 5.9.3 | Language |
| Drizzle ORM | 0.45.2 | Database ORM |
| PostgreSQL | 14+ | Database |
| Clerk Express | 2.1.30 | Auth middleware |
| Stripe | 22.2.2 | Payments |
| Pino | 9.14.0 | Logging |
| Zod | 3.25.76 | Validation |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| pnpm | Package manager |
| pnpm workspaces | Monorepo |
| Drizzle Kit | Schema management |
| Orval | API client codegen |
| esbuild | Bundling |

---

## Architecture

### Monorepo Structure

```
workspace/
├── artifacts/
│   ├── tempnest/          # React frontend (Vite)
│   ├── api-server/          # Express API server
│   └── mockup-sandbox/      # Design sandbox
├── lib/
│   ├── db/                  # Database schema + Drizzle ORM
│   ├── api-client-react/    # Generated React Query hooks
│   └── api-zod/             # Generated Zod schemas
├── lib/integrations/
│   └── openapi.yaml         # OpenAPI contract
├── scripts/
│   └── ...                  # Utility scripts
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

### Contract-First API

The API is designed with an OpenAPI-first approach:

1. **OpenAPI Spec** (`lib/api-spec/openapi.yaml`) defines all endpoints
2. **Orval codegen** generates typed React Query hooks and Zod schemas
3. **Server** validates inputs with Zod schemas
4. **Client** uses generated hooks for type-safe data fetching

```bash
# Regenerate API client
pnpm --filter @workspace/api-spec run codegen
```

### Auth Flow

- Clerk handles authentication via JWT tokens
- `getOrCreateUser()` in `auth.ts` syncs Clerk users to the local DB
- Admin privileges are enforced server-side via `requireAdmin` middleware
- Admin users get unlimited credits (`credits: 999999`, `maxInboxes: -1`)

---

## Project Structure

### Key Files

| File | Purpose |
|------|---------|
| `artifacts/api-server/src/app.ts` | Express app setup, Clerk middleware |
| `artifacts/api-server/src/lib/auth.ts` | `requireAuth`, `requireAdmin`, `getOrCreateUser` |
| `artifacts/api-server/src/lib/mailtm.ts` | Mail.tm API client, OTP extractor |
| `artifacts/api-server/src/routes/` | All API routes (me, inboxes, emails, credits, payments, admin, etc.) |
| `artifacts/tempnest/src/App.tsx` | Root component with routing |
| `artifacts/tempnest/src/pages/` | All page components |
| `artifacts/tempnest/src/components/layout/main-layout.tsx` | Sidebar layout with admin navigation |
| `lib/db/src/schema/` | All database schemas |
| `lib/api-spec/openapi.yaml` | OpenAPI contract definition |

### Routes

#### API Routes

| Route | Auth | Description |
|-------|------|-------------|
| `GET /api/healthz` | Public | Health check |
| `GET /api/me` | Auth | Get current user profile |
| `PATCH /api/me` | Auth | Update user profile |
| `PATCH /api/me/notifications` | Auth | Update notification preferences |
| `GET /api/inboxes` | Auth | List user's inboxes |
| `POST /api/inboxes` | Auth | Create new inbox |
| `GET /api/inboxes/:id` | Auth | Get inbox details |
| `DELETE /api/inboxes/:id` | Auth | Deactivate inbox |
| `POST /api/inboxes/:id/refresh` | Auth | Fetch new emails from Mail.tm |
| `GET /api/inboxes/:id/emails` | Auth | List emails in inbox |
| `GET /api/inboxes/:id/otp-history` | Auth | OTP extraction history |
| `GET /api/emails` | Auth | All user's emails |
| `GET /api/emails/:id` | Auth | Email detail |
| `PATCH /api/emails/:id/read` | Auth | Mark as read |
| `GET /api/credits` | Auth | Current balance |
| `GET /api/credits/transactions` | Auth | Transaction history |
| `GET /api/plans` | Auth | Available plans |
| `GET /api/subscriptions/current` | Auth | Current subscription |
| `POST /api/payments/checkout` | Auth | Stripe checkout session |
| `POST /api/payments/webhook` | Public | Stripe webhook handler |
| `GET /api/dashboard/summary` | Auth | Dashboard data |
| `GET /api/analytics` | Auth | Usage analytics |
| `POST /api/admin/claim` | Auth | Claim admin (email-restricted) |
| `GET /api/admin/stats` | Admin | Admin dashboard stats |
| `GET /api/admin/users` | Admin | List all users |
| `PATCH /api/admin/users/:id` | Admin | Update user |
| `DELETE /api/admin/users/:id` | Admin | Delete user |
| `GET /api/admin/inboxes` | Admin | List all inboxes |
| `GET /api/admin/revenue` | Admin | Revenue analytics |

#### Frontend Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Landing page |
| `/sign-in` | Public | Sign in page |
| `/sign-up` | Public | Sign up page |
| `/pricing` | Public | Pricing plans |
| `/dashboard` | Auth | User dashboard |
| `/inboxes` | Auth | Inbox management |
| `/inboxes/:id` | Auth | Inbox detail |
| `/emails/:id` | Auth | Email detail |
| `/credits` | Auth | Credit wallet |
| `/analytics` | Auth | Usage analytics |
| `/settings` | Auth | Account settings |
| `/admin` | Admin | Admin overview |
| `/admin/users` | Admin | User management |
| `/admin/inboxes` | Admin | Inbox management |
| `/admin/revenue` | Admin | Revenue analytics |

---

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | User profiles synced from Clerk |
| `inboxes` | Temporary email inboxes (Mail.tm accounts) |
| `emails` | Email messages synced from Mail.tm |
| `otp_records` | Extracted OTP/verification codes |
| `credit_transactions` | Credit debit/credit/refill transactions |
| `payments` | Stripe payment records |
| `subscriptions` | Stripe subscription records |

### User Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `clerk_id` | TEXT | Clerk user ID |
| `email` | TEXT | User email (unique) |
| `name` | TEXT | Display name |
| `plan` | ENUM | free, pro, business |
| `credits` | INT | Current credit balance |
| `max_credits` | INT | Maximum credit cap |
| `daily_refill` | INT | Daily refill amount |
| `max_inboxes` | INT | Max active inboxes |
| `status` | ENUM | active, suspended, banned |
| `is_admin` | BOOLEAN | Admin flag |
| `last_refill_at` | TIMESTAMP | Last refill time |
| `notify_new_email` | BOOLEAN | Notification setting |
| `notify_otp` | BOOLEAN | Notification setting |
| `notify_low_credits` | BOOLEAN | Notification setting |
| `notify_weekly_summary` | BOOLEAN | Notification setting |
| `created_at` | TIMESTAMP | Account creation |
| `updated_at` | TIMESTAMP | Last update |

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL database
- Clerk account (for auth)
- Stripe account (for payments)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
# Copy .env.example or configure via your deployment platform

# Push database schema
pnpm --filter @workspace/db run push

# Generate API client
pnpm --filter @workspace/api-spec run codegen

# Typecheck everything
pnpm run typecheck

# Build everything
pnpm run build
```

### Run Locally

```bash
# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the frontend (in another terminal)
pm --filter @workspace/tempnest run dev
```

---

## Environment Variables

### Required

| Variable | Description | Used By |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | API server |
| `PORT` | Server port | API server |
| `SESSION_SECRET` | Session encryption secret | API server |
| `CLERK_PUBLISHABLE_KEY` | Clerk public key | Frontend |
| `CLERK_SECRET_KEY` | Clerk secret key | API server |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same as above, for Vite | Frontend |
| `BASE_PATH` | Base URL path for frontend | Frontend |

### Optional

| Variable | Description | Used By |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key | API server |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | API server |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | Frontend |
| `ADMIN_EMAIL` | Admin email address | API server |
| `VITE_CLERK_PROXY_URL` | Clerk proxy URL | Frontend |
| `NODE_ENV` | development or production | Both |

---

## Development

### Common Commands

```bash
# Full typecheck
pnpm run typecheck

# Typecheck libraries only
pnpm run typecheck:libs

# Build all packages
pnpm run build

# Regenerate API client
pnpm --filter @workspace/api-spec run codegen

# Push DB schema
pnpm --filter @workspace/db run push

# Push DB schema (force)
pnpm --filter @workspace/db run push-force

# Run API server
pnpm --filter @workspace/api-server run dev

# Run frontend
pnpm --filter @workspace/tempnest run dev

# Run API server tests
pnpm --filter @workspace/api-server run test

# Run frontend tests
pnpm --filter @workspace/tempnest run test
```

### Adding a New API Route

1. Define the endpoint in `lib/api-spec/openapi.yaml`
2. Implement the route in `artifacts/api-server/src/routes/`
3. Run `pnpm --filter @workspace/api-spec run codegen`
4. Use the generated hook in the frontend

### Adding a New Database Table

1. Define the schema in `lib/db/src/schema/<name>.ts`
2. Export it from `lib/db/src/schema/index.ts`
3. Run `pnpm --filter @workspace/db run push`
4. Run `pnpm run typecheck`

---

## Admin Access

The admin email is hardcoded to `rizubanerjee456@gmail.com`. When a user with this email logs in, they can be granted admin privileges via the `/api/admin/claim` endpoint.

Admin users receive:
- Unlimited credits (999999)
- Unlimited inboxes (`-1` limit)
- Unlimited daily refills
- Free inbox creation and refreshes
- Access to admin dashboard (users, inboxes, revenue)

### Admin Middleware

- `requireAuth` — checks Clerk authentication
- `requireAdmin` — checks `isAdmin` flag in database

### Admin Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/claim` | POST | Claim admin (if email matches) |
| `/api/admin/stats` | GET | Dashboard stats |
| `/api/admin/users` | GET | List all users |
| `/api/admin/users/:id` | PATCH | Update user |
| `/api/admin/users/:id` | DELETE | Delete user |
| `/api/admin/inboxes` | GET | List all inboxes |
| `/api/admin/revenue` | GET | Revenue analytics |

---

## Credit System

### Credit Costs

| Action | Cost |
|--------|------|
| Create inbox | 2 credits |
| Custom inbox name | +5 credits |
| Priority inbox | +10 credits |
| Refresh inbox | 1 credit |
| Receive email | 1 credit |

### Credit Limits by Plan

| Plan | Max Credits | Daily Refill | Max Inboxes | Price |
|------|-------------|--------------|-------------|-------|
| Free | 50 | 20/day | 1 | $0 |
| Pro | 1000 | 1000/mo | 5 | $9.99/mo |
| Business | 5000 | 5000/mo | Unlimited | $29.99/mo |

### Admin Override

Admin users (`isAdmin = true`) have unlimited credits and no inbox limits.

---

## Pricing Plans

| Plan | Monthly | Features |
|------|---------|----------|
| **Free** | $0 | 50 credits, 20/day refill, 1 inbox |
| **Pro** | $9.99 | 1000 credits, 1000/mo refill, 5 inboxes |
| **Business** | $29.99 | 5000 credits, 5000/mo refill, unlimited inboxes |

### Credit Packs

One-time purchase packs available:
- 100 credits
- 500 credits
- 1000 credits

---

## Deployment

### Replit

The project is designed to run on Replit with:
- Path-based routing (`/` for frontend, `/api` for backend)
- Workflow-based process management
- Automatic workflow restart on code changes

### Environment Setup

1. Set all required environment variables in Replit Secrets
2. Ensure `DATABASE_URL` points to a valid PostgreSQL instance
3. Configure Clerk and Stripe keys
4. Deploy workflows will auto-start

### Build

```bash
pnpm run build
```

### Stripe Webhooks

Configure Stripe webhook endpoint to `https://yourdomain.com/api/payments/webhook` with the `payment_intent.succeeded` and `invoice.payment_succeeded` events.

---

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Mail.tm](https://mail.tm) for providing the temporary email API
- [Clerk](https://clerk.com) for authentication infrastructure
- [Stripe](https://stripe.com) for payment processing
- [shadcn/ui](https://ui.shadcn.com) for the component design system
- [Replit](https://replit.com) for the development platform

---

## Support

For issues or feature requests, please open a GitHub issue.

---

*Built with React, Express, Drizzle, and Tailwind CSS.*
