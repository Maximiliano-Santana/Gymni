# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Database (run Docker first)
docker compose up -d                  # Start PostgreSQL on port 5432
npx prisma migrate dev                # Run migrations
npx prisma db seed                    # Seed tenants, plans, members, subscriptions
npx prisma studio                     # Visual DB browser at localhost:5555
npx prisma generate                   # Regenerate client after schema changes
```

## Architecture

### Multi-tenancy via Subdomain

The core of the app. `src/middleware.ts` reads the `Host` header, extracts the subdomain, and forwards it as `x-tenant-subdomain` on every request. In development, any request to `localhost` gets mapped to `"dev-gym"` automatically.

The tenant layout (`src/app/(tenant)/layout.tsx`) calls `validateTenantSubdomain()` to resolve the tenant from DB, then passes it to `<Providers>` which wraps `<SessionProvider>` and `<TenantProvider>`. Theming is injected via `<link rel="stylesheet" href="/api/tenants/theme">` in the layout `<head>`.

### Route Protection (Middleware)

`src/middleware.ts` enforces three layers of protection:
- **`isProtected`** — `/dashboard`, `/admin`, `/app`, `/api/protected` require authentication (redirects to `/login`).
- **`isTenantOnly`** — `/dashboard`, `/admin` are blocked on the root domain (redirects to `/app`).
- **`isPlatformOnly`** — `/app` is blocked on tenant subdomains (redirects to `/dashboard`).

### Role-based Authorization

Admin routes use **server component layouts** for role checks (no client-side flash):
- `src/app/(tenant)/admin/layout.tsx` — checks `isStaffRole()`, redirects non-staff to `/dashboard`.
- `src/app/(tenant)/(user)/layout.tsx` — checks tenant membership, redirects non-members to `/login`.
- Individual admin pages check granular permissions via `canAccess(page, roles)` from `src/features/admin/lib/permissions.ts`.

**Permission matrix** (`ADMIN_PAGES`):
| Page       | OWNER | ADMIN | STAFF |
|------------|-------|-------|-------|
| dashboard  | ✓     | ✓     | ✓     |
| members    | ✓     | ✓     | ✓     |
| staff      | ✓     | ✓     |       |
| plans      | ✓     |       |       |
| settings   | ✓     | ✓     |       |

**Centralized role helpers** in `src/features/auth/lib/index.ts`:
- `STAFF_ROLES: TenantRole[]` — `["OWNER", "ADMIN", "STAFF"]`
- `isStaffRole(roles)` — returns true if any role is a staff role

### Theming System

Tenants store a `TenantSettings` JSON blob in `tenant.settings` (see `src/features/tenants/types/settings.ts`). The route `GET /api/tenants/theme` reads this blob, merges it with `DEFAULT_TENANT_SETTINGS`, and generates a complete CSS `:root { ... }` block with semantic tokens, gray scale, and chart colors (`src/features/tenants/server/theme.ts`). The endpoint also accepts `?tenant=<subdomain>` to force a specific tenant's theme. Caching uses ETag based on `tenant.id + updatedAt`.

`globals.css` maps all CSS variables to Tailwind tokens via `@theme inline`, so Tailwind classes like `bg-primary` and `text-foreground` automatically reflect the tenant's theme.

**Color convention: follow the shadcn standard.** Do NOT create custom color tokens (e.g. `--primary-light`, `--primary-hover`). Instead:
- Use the semantic tokens shadcn defines: `primary`, `secondary`, `accent`, `muted`, `destructive`, `background`, `foreground`, `card`, `popover`, `border`, `input`, `ring`, plus their `-foreground` counterparts.
- For hover, focus, and subtle variants, use Tailwind opacity modifiers: `bg-primary/90` (hover), `bg-primary/10` (subtle bg), `border-primary/20` (light border), etc.
- The gray scale (`gray-100` to `gray-900`) and chart colors (`chart-1` to `chart-5`) are also available and derived from the tenant's settings.
- Theme preview available at `/theme-preview` (public, no auth required).

Seed tenants for testing: `dev-gym` (dark + purple), `green-gym` (light + green). Default theme is light + orange.

### Type Patterns

- **`TenantTyped`** (`src/features/tenants/types/settings.ts`) — `Omit<Tenant, "settings"> & { settings: TenantSettings | null }`. Used everywhere instead of Prisma's raw `Tenant` type (which has `settings: JsonValue`). Single cast point is in `validateTenantSubdomain()`.
- **`getTenantSettings(tenant)`** — safely extracts `TenantSettings` from any tenant object.

### Auth (NextAuth v4, JWT strategy)

Config at `src/app/api/auth/[...nextauth]/route.ts`. On login, the JWT callback fetches all tenants the user belongs to and stores them as `token.tenants: Record<subdomain, { tenantId, roles[] }>`. This map is exposed on `session.user.tenants`.

**Google OAuth** is configured with automatic account linking. The `signIn` callback:
1. Links Google accounts to existing users with the same email.
2. Auto-detects pending invitations when logging in from a tenant subdomain.
3. Creates `TenantUser` with the invitation's role (or MEMBER if no invitation).
4. Marks the invitation as used.

**Invitation system** (`POST /api/auth/invitation`):
- If invitee already has an account → directly adds/updates TenantUser with the role.
- If invitee doesn't exist → creates an `Invitation` record (30-day expiry). Registration with `?invitation=<id>` in the URL consumes it.
- The invitation token acts as a security measure — knowing the email alone isn't enough to claim a role.

**API authorization helpers** in `src/app/api/lib/validation.ts`:
- `requireTenantRoles(needed[])` — reads tenant from JWT (no DB hit), checks roles. Use this in most API routes.
- `validateSuperAdmin()` — checks `session.user.systemRole === "SUPER_ADMIN"`.
- `validateTenantAdmin(tenantId)` / `validateTenantStaff(tenantId)` — DB-backed checks.

### Two-Layer Billing

**Gymni → Tenant** (platform billing): `Plan`, `PlanPrice`, `Subscription`, `Invoice`, `Payment` models. Supports MANUAL/LEMONSQUEEZY/PADDLE providers. Cron job at `src/app/api/cron/billing/route.ts`.

**Tenant → Member** (gym membership billing — Stripe-ready pattern):
- `MembershipPlan` — what the gym sells (Básico, Premium). Unique per `[tenantId, code]`.
- `MembershipPrice` — pricing per interval. Uses `intervalCount` for quarterly support (1=monthly, 3=quarterly, 12=annual).
- `MemberSubscription` — links a member to a plan+price. Status: `ACTIVE | PAST_DUE | CANCELED`.
- `MemberInvoice` — what the member owes per period. Stores `planId`/`priceId` snapshots for audit.
- `MemberPayment` — how/when the member paid. Supports partial payments and multiple methods.

Optional fields `providerPriceId`, `providerProductId`, `providerSubId` are ready for Stripe integration.

### Route Groups

```
src/app/
  (marketing)/          # Public landing page
  (platform)/           # Root domain routes (no tenant context)
    app/                # User's gym list (/app)
  (tenant)/
    layout.tsx          # Resolves tenant, injects theme + providers
    (auth)/             # /login, /register
    (user)/             # Member-facing dashboard
    admin/              # Gym admin panel (sidebar layout)
      members/          # Member list + [id] detail
      staff/            # Staff management
      plans/            # Membership plans
      settings/         # Gym configuration
  api/
    auth/               # NextAuth + register + invitation
    tenants/            # CRUD, theme CSS, subscription, payment
    tenant/             # Tenant-scoped admin APIs
      dashboard/        # Stats (members, revenue, expiring subs)
      members/          # Member CRUD + [id] detail
      plans/            # Membership plan CRUD + [id]
      subscriptions/    # Assign/cancel member subscriptions
      payments/         # Register manual payments
      staff/            # Staff management
      settings/         # Gym config (name, address, theme)
    users/              # User routes
    cron/billing/       # Periodic billing job
```

### Feature Modules (`src/features/`)

Each feature owns its types, lib (client utils), server (server-only logic), components, and providers:
- `auth/` — forms, validation schemas, API client, types, `STAFF_ROLES`/`isStaffRole()` helpers
- `tenants/` — `TenantTyped`, `TenantSettings`, default settings, CSS generation, TenantContext provider, tenant resolution
- `billing-platform/` — TypeScript types (subscription, payment DTOs) for Gymni→Tenant billing
- `billing-members/` — Zod schemas and DTOs for Tenant→Member billing (plans, subscriptions, payments)
- `members/` — Member list/detail types (`MemberListItem`, `MemberDetail`, `AddMemberSchema`)
- `admin/` — Admin panel components (Sidebar, Header, MembersTable, MemberDetail, StaffTable, PlansView, SettingsForm) and permissions (`canAccess`, `ADMIN_PAGES`)

### Database

PostgreSQL via Docker (`docker-compose.yml`). Prisma schema at `prisma/schema.prisma`.

Key roles: `SystemRole` (USER | SUPER_ADMIN) lives on the `User` model. `TenantRole` (OWNER | ADMIN | STAFF | MEMBER) lives on the `TenantUser` join model — a user can have multiple roles per tenant.

Seed data (`prisma/seed.js`): 2 tenants (dev-gym, green-gym), 2 owners, 1 platform plan (Basic), 2 membership plans per gym (Básico + Premium) with 3 prices each (monthly/quarterly/annual), 5 sample members with subscriptions, invoices, and payments.

## Known WIP / Incomplete Areas

- `src/features/auth/server/index.ts` — `CreateUser()` is empty (unused — registration goes through the API route directly)
- No email sending for invitations — the UI shows a copyable link instead
- Member dashboard (`/dashboard`) — basic placeholder, no member-facing subscription/payment views yet
- No password reset flow
