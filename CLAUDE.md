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

### Dev vs Prod Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| **Subdomains** | `acme.localhost:3000` (middleware extracts subdomain from `.localhost`) | `acme.gymni.mx` (real wildcard DNS) |
| **Default tenant** | `localhost:3000` maps to `dev-gym` automatically | Root domain `gymni.mx` has no tenant (landing page) |
| **Database** | Docker PostgreSQL (`docker compose up -d`) | Neon PostgreSQL (serverless, `?sslmode=require`) |
| **Migrations** | `npx prisma migrate dev` (creates migration files) | `npx prisma migrate deploy` (applies existing migrations only) |
| **Images** | Saved to `public/uploads/` (local filesystem) | Vercel Blob (`BLOB_READ_WRITE_TOKEN` auto-detected) |
| **Emails** | Resend sends if `RESEND_API_KEY` set, skips test domains | Resend via `mail.gymni.mx` verified domain |
| **Build** | `next build --turbopack` | `prisma generate && next build --turbopack` (Vercel caches node_modules) |
| **NEXTAUTH_URL** | `http://localhost:3000` | `https://gymni.mx` |
| **Tunnels** | ngrok URLs auto-map to `dev-gym` tenant | N/A |

**Important dev note**: On Windows, closing the dev server before running `npm run build` is required — Prisma's DLL gets locked by the running process.

## Architecture

### Multi-tenancy via Subdomain

The core of the app. `src/middleware.ts` reads the `Host` header, extracts the subdomain, and forwards it as `x-tenant-subdomain` on every request. In development, any request to `localhost` gets mapped to `"dev-gym"` automatically.

**Subdomain resolution in server components**: Use `getSubdomain()` from `@/features/tenants/lib` — NEVER read `x-tenant-subdomain` header directly. This helper reads the middleware header with a fallback to parsing the standard `host` header, because Vercel Edge Runtime doesn't guarantee custom middleware headers reach server components.

The tenant layout (`src/app/(tenant)/layout.tsx`) calls `validateTenantSubdomain()` (which uses `getSubdomain()` internally) to resolve the tenant from DB, then passes it to `<Providers>` which wraps `<SessionProvider>` and `<TenantProvider>`. Theming is injected via `<link rel="stylesheet" href="/api/tenants/theme">` in the layout `<head>`.

### Route Protection (Middleware)

`src/middleware.ts` enforces four layers of protection:
- **`isProtected`** — `/dashboard`, `/admin`, `/app`, `/api/protected` require authentication (redirects to `/login`).
- **`isTenantOnly`** — `/dashboard`, `/admin` are blocked on the root domain (redirects to `/app`).
- **`isPlatformOnly`** — `/app` is blocked on tenant subdomains (redirects to `/dashboard`).
- **Subdomain root** — `/` on a tenant subdomain redirects based on role: staff (OWNER/ADMIN/STAFF) → `/admin`, members → `/dashboard`, unauthenticated → `/login`. No marketing page on subdomains.

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

Tenants store a `TenantSettings` JSON blob in `tenant.settings` (see `src/features/tenants/types/settings.ts`). The route `GET /api/tenants/theme` reads this blob, merges it with `DEFAULT_TENANT_SETTINGS`, and generates a complete CSS `:root { ... }` block with semantic tokens, gray scale, and chart colors (`src/features/tenants/server/theme.ts`). The endpoint also accepts `?tenant=<subdomain>` to force a specific tenant's theme. Caching uses ETag with `must-revalidate` — changes apply immediately.

**Branding**: Tenants can upload a logo and favicon via Admin → Settings → "Marca". Upload endpoint at `POST/DELETE /api/tenant/settings/branding` (FormData with `file` + `type`). Logo displays in AdminSidebar, login page, and member dashboard header. Favicon is set in the tenant layout metadata. Images stored via Vercel Blob (prod) or `public/uploads/` (dev).

**Live theme preview**: The settings form (`SettingsForm.tsx`) imports `generateTenantCSS()` on the client and injects a `<style>` tag on every change, so theme edits are visible instantly without saving. Color fields for success/warning include preset buttons.

`globals.css` maps all CSS variables to Tailwind tokens via `@theme inline`, so Tailwind classes like `bg-primary` and `text-foreground` automatically reflect the tenant's theme.

**Color convention: follow the shadcn standard.** Do NOT create custom color tokens (e.g. `--primary-light`, `--primary-hover`). Instead:
- Use the semantic tokens shadcn defines: `primary`, `secondary`, `accent`, `muted`, `destructive`, `background`, `foreground`, `card`, `popover`, `border`, `input`, `ring`, plus their `-foreground` counterparts.
- For hover, focus, and subtle variants, use Tailwind opacity modifiers: `bg-primary/90` (hover), `bg-primary/10` (subtle bg), `border-primary/20` (light border), etc.
- The gray scale (`gray-100` to `gray-900`) and chart colors (`chart-1` to `chart-5`) are also available and derived from the tenant's settings.
- Theme preview available at `/theme-preview` (public, no auth required).

Seed tenants for testing: `dev-gym` (dark + purple), `green-gym` (light + green). Default theme is dark + purple.

### Timezone Handling

Each tenant has a `timezone` field in `TenantSettings` (IANA format, e.g. `"America/Mexico_City"`). Default: `"America/Mexico_City"`. Configurable via Admin → Settings → "Información general".

**Centralized utility** at `src/lib/timezone.ts` — zero dependencies, uses `Intl.DateTimeFormat`:
- `getDayBoundsUTC(tz)` — returns `{ start, end }` as UTC Dates for "today" in the gym's timezone. Used in check-in duplicate detection.
- `localMidnightToUTC(dateStr, tz)` — converts `"YYYY-MM-DD"` at midnight local to UTC Date. Used for DB query boundaries (month start, etc.).
- `todayInTimezone(tz)` / `dateToTimezoneStr(date, tz)` — returns `"YYYY-MM-DD"` in the gym's timezone. Used for streak/attendance calculations.
- `formatTenantDate(date, tz)` — display helper, returns e.g. `"6 mar 2026"`.
- `formatTenantTime(date, tz)` — display helper, returns e.g. `"11:30 p.m."`.

**Rules**:
- **NEVER use `setHours(0,0,0,0)`** for "today" boundaries — it uses the server's timezone. Use `getDayBoundsUTC(tz)`.
- **NEVER use `new Date(y, m, 1)`** for month boundaries in DB queries — use `localMidnightToUTC("YYYY-MM-01", tz)`.
- **NEVER use `toLocaleDateString()` without timezone** — use `formatTenantDate(date, tz)` / `formatTenantTime(date, tz)`.
- **Server components**: fetch tenant settings from DB to get timezone.
- **Client components**: use `useTenant()` + `getTenantSettings(tenant)?.timezone ?? "America/Mexico_City"`.
- Timestamps are stored in UTC in the database (correct). Only convert for display and day-boundary calculations.

### Type Patterns

- **`TenantTyped`** (`src/features/tenants/types/settings.ts`) — `Omit<Tenant, "settings"> & { settings: TenantSettings | null }`. Used everywhere instead of Prisma's raw `Tenant` type (which has `settings: JsonValue`). Single cast point is in `validateTenantSubdomain()`.
- **`getTenantSettings(tenant)`** — safely extracts `TenantSettings` from any tenant object.

### Auth (NextAuth v4, JWT strategy)

Config lives in `src/lib/auth-options.ts` (exported as `authOptions`), re-exported by `src/app/api/auth/[...nextauth]/route.ts`. NextAuth route files can only export HTTP handlers — never put `authOptions` or other non-handler exports in route files. On login, the JWT callback fetches all tenants the user belongs to and stores them as `token.tenants: Record<subdomain, { tenantId, roles[] }>`. This map is exposed on `session.user.tenants`. A custom `redirect` callback allows callbackUrls on tenant subdomains (needed for logout to stay on the subdomain).

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
- `MemberInvoice` — what the member owes per period. `dueAt` = real payment deadline (includes grace days). Stores `planId`/`priceId` snapshots for audit.
- `MemberPayment` — how/when the member paid. Supports partial payments and multiple methods.

Optional fields `providerPriceId`, `providerProductId`, `providerSubId` are ready for Stripe integration.

**Member billing lifecycle** (cron at `src/app/api/cron/billing/route.ts`):

The cron runs `processMemberBilling()` which handles 3 cases in order:
1. **Auto-renew**: ACTIVE sub past `billingEndsAt` + last invoice `paid` → extends `billingEndsAt` by price interval, creates new `open` invoice with `dueAt = old billingEndsAt + graceDays`.
2. **PAST_DUE**: ACTIVE sub + last invoice `open` + `dueAt <= now` → marks subscription `PAST_DUE`.
3. **Auto-cancel**: PAST_DUE sub + `dueAt + autoCancelDays <= now` → marks `CANCELED`, voids open invoice.

**Billing settings** per tenant (`TenantSettings.billing`):
- `graceDays` (default: 0) — days after period start before marking as PAST_DUE. Baked into `invoice.dueAt` at creation.
- `autoCancelDays` (default: 0, 0 = never) — days in PAST_DUE before auto-canceling.
- Configurable via Admin → Settings → "Facturación" section (OWNER only).

**Payment reactivation**: When a PAST_DUE member pays fully, the subscription reactivates with `billingEndsAt` extended from the **previous** end date (not the payment date), so members don't benefit from paying late.

**Check-in enforcement**: Check-in never blocks — the lookup API returns a `warning` field (`"Membresía con adeudo"`, `"Membresía vencida"`, etc.) and the CheckInScreen shows a red alert with a "Ver miembro" link for quick management. Staff decides whether to allow entry. Check-in supports two modes: **QR scan** (`POST /api/tenant/checkin/lookup`) and **manual search by name/email** (`POST /api/tenant/checkin/search`). Both lead to the same preview → confirm flow.

**Member dashboard** shows billing status: "Al corriente" (paid) or "Pago pendiente: $X" with due date. Amounts reflect real balance (total - partial payments).

**Invoice table** (admin member detail) includes a "Pendiente" column showing remaining balance after partial payments.

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
      checkin/            # QR scanner + manual search check-in
      members/          # Member list + [id] detail (paginated, server-side search/filters)
      staff/            # Staff management
      plans/            # Membership plans
      settings/         # Gym configuration
  api/
    auth/               # NextAuth + register + invitation
    tenants/            # CRUD, theme CSS, subscription, payment
    tenant/             # Tenant-scoped admin APIs
      checkin/          # lookup (QR), search (name/email), confirm
      dashboard/        # Stats (members, revenue, expiring subs)
      members/          # Member CRUD + [id] detail (paginated, search, status filters)
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
- `members/` — Member list/detail types (`MemberListItem`, `MemberDetail`, `AddMemberSchema`, `PaginatedMembers`), shared query builder (`server/queries.ts`)
- `checkin/` — Zod schemas (`CheckInLookupSchema`, `CheckInSearchSchema`, `CheckInConfirmSchema`) and `CheckInMemberInfo` type
- `admin/` — Admin panel components (Sidebar, Header, MembersTable, MemberDetail, StaffTable, PlansView, SettingsForm, CheckInScreen) and permissions (`canAccess`, `ADMIN_PAGES`)

### Database

PostgreSQL via Docker (`docker-compose.yml`). Prisma schema at `prisma/schema.prisma`.

Key roles: `SystemRole` (USER | SUPER_ADMIN) lives on the `User` model. `TenantRole` (OWNER | ADMIN | STAFF | MEMBER) lives on the `TenantUser` join model — a user can have multiple roles per tenant.

Seed data (`prisma/seed.js`): 2 tenants (dev-gym, green-gym), 2 owners, 1 platform plan (Basic), 2 membership plans per gym (Básico + Premium) with 3 prices each (monthly/quarterly/annual), 5 sample members with billing test scenarios:
- Carlos: ACTIVE + paid (healthy, cron skips)
- María: ACTIVE + paid + expired (cron auto-renews)
- Juan: ACTIVE + open invoice + expired (cron marks PAST_DUE)
- Ana: PAST_DUE + old open invoice (cron auto-cancels)
- Pedro: no subscription (check-in warning)

Dev-gym has `billing: { graceDays: 3, autoCancelDays: 30 }` configured. All member passwords: `tashamaria123*d`.

### Email Notifications (`src/emails/` + `src/lib/email.ts`)

Uses **Resend** with React Email components. `sendEmail()` gracefully skips if `RESEND_API_KEY` is not set and ignores test email domains.

**Templates**:
- `WelcomeEmail` — sent when adding a member. Includes temp password + login URL + change password link for new users, or just a welcome message for existing users added to a gym.
- `InvitationEmail` — staff invitation with registration link.
- `PaymentDueEmail` — sent by billing cron when subscription becomes PAST_DUE.
- `MembershipCanceledEmail` — sent by billing cron on auto-cancellation.
- `PasswordResetEmail` — forgot password flow.

### Members Query Builder (`src/features/members/server/queries.ts`)

Shared `queryMembers({ tenantId, search, status, page })` used by both the page server component and the API route:
- **Pagination**: 20 per page, returns `total`, `totalPages`
- **Search**: case-insensitive on `user.name` and `user.email`
- **Status filters**: `ACTIVE`, `PAST_DUE`, `CANCELED` (has subs but none active/past_due), `sin_plan` (no subscriptions)
- URL state persists search/filter/page across refreshes via `searchParams`

### Deployment

- **Hosting**: Vercel (auto-deploy on push to `main`)
- **Database**: Neon PostgreSQL (serverless). Use `npx prisma migrate deploy` (not `migrate dev`) in production.
- **Images**: Vercel Blob (`BLOB_READ_WRITE_TOKEN`). Photo upload detects the token and uses Blob in production, local filesystem in development.
- **Emails**: Resend with domain `mail.gymni.mx`
- **Cron**: Vercel Crons — billing runs daily at 6am UTC (`vercel.json`)
- **Domain**: `gymni.mx` + `*.gymni.mx` (wildcard for tenant subdomains). DNS via Vercel nameservers.
- **Build**: `prisma generate && next build --turbopack` (Prisma generate needed because Vercel caches node_modules).

## Known WIP / Incomplete Areas

- No Stripe/LemonSqueezy/Paddle integration yet (provider fields are ready but unconnected)
- Google OAuth is hidden (disabled in UI)
