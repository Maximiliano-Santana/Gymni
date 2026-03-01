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
npx prisma db seed                    # Seed dev-gym tenant + BASIC plan
npx prisma studio                     # Visual DB browser at localhost:5555
npx prisma generate                   # Regenerate client after schema changes
```

## Architecture

### Multi-tenancy via Subdomain

The core of the app. `src/middleware.ts` reads the `Host` header, extracts the subdomain, and forwards it as `x-tenant-subdomain` on every request. In development, any request to `localhost` gets mapped to `"dev-gym"` automatically.

The tenant layout (`src/app/(tenant)/layout.tsx`) calls `validateTenantSubdomain()` to resolve the tenant from DB, then passes it to `<Providers>` which wraps `<SessionProvider>` and `<TenantProvider>`. Theming is injected via `<link rel="stylesheet" href="/api/tenants/theme">` in the layout `<head>`.

### Theming System

Tenants store a `TenantSettings` JSON blob in `tenant.settings` (see `src/features/tenants/types/settings.ts`). The route `GET /api/tenants/theme` reads this blob, merges it with `DEFAULT_TENANT_SETTINGS`, and generates a complete CSS `:root { ... }` block with semantic tokens, gray scale, and chart colors (`src/features/tenants/server/theme.ts`). The endpoint also accepts `?tenant=<subdomain>` to force a specific tenant's theme. Caching uses ETag based on `tenant.id + updatedAt`.

`globals.css` maps all CSS variables to Tailwind tokens via `@theme inline`, so Tailwind classes like `bg-primary` and `text-foreground` automatically reflect the tenant's theme.

**Color convention: follow the shadcn standard.** Do NOT create custom color tokens (e.g. `--primary-light`, `--primary-hover`). Instead:
- Use the semantic tokens shadcn defines: `primary`, `secondary`, `accent`, `muted`, `destructive`, `background`, `foreground`, `card`, `popover`, `border`, `input`, `ring`, plus their `-foreground` counterparts.
- For hover, focus, and subtle variants, use Tailwind opacity modifiers: `bg-primary/90` (hover), `bg-primary/10` (subtle bg), `border-primary/20` (light border), etc.
- The gray scale (`gray-100` to `gray-900`) and chart colors (`chart-1` to `chart-5`) are also available and derived from the tenant's settings.
- Theme preview available at `/theme-preview` (public, no auth required).

Seed tenants for testing: `dev-gym` (dark + purple), `green-gym` (light + green). Default theme is light + orange.

### Auth (NextAuth v4, JWT strategy)

Config at `src/app/api/auth/[...nextauth]/route.ts`. On login, the JWT callback fetches all tenants the user belongs to and stores them as `token.tenants: Record<subdomain, { tenantId, roles[] }>`. This map is exposed on `session.user.tenants`.

**API authorization helpers** in `src/app/api/lib/validation.ts`:
- `requireTenantRoles(needed[])` — reads tenant from JWT (no DB hit), checks roles. Use this in most API routes.
- `validateSuperAdmin()` — checks `session.user.systemRole === "SUPER_ADMIN"`.
- `validateTenantAdmin(tenantId)` / `validateTenantStaff(tenantId)` — DB-backed checks.

### Two-Layer Billing

**Gymni → Tenant** (platform billing): `Plan`, `PlanPrice`, `Subscription`, `Invoice`, `Payment` models. Supports MANUAL/LEMONSQUEEZY/PADDLE providers. Cron job at `src/app/api/cron/billing/route.ts`.

**Tenant → Member** (gym membership billing): `MembershipPlan` model — currently a stub, not implemented.

### Route Groups

```
src/app/
  (marketing)/          # Public landing page
  (tenant)/
    layout.tsx          # Resolves tenant, injects theme + providers
    (auth)/             # /login, /register
    (user)/             # Member-facing dashboard
    admin/              # Gym admin panel
  api/
    auth/               # NextAuth + register + invitation
    tenants/            # CRUD, theme CSS, subscription, payment
    tenant/staff/       # Staff management
    users/              # User routes
    cron/billing/       # Periodic billing job
```

### Feature Modules (`src/features/`)

Each feature owns its types, lib (client utils), server (server-only logic), components, and providers:
- `auth/` — forms, validation schemas, API client, types
- `tenants/` — settings types, default settings, CSS generation, TenantContext provider, tenant resolution
- `billing-platform/` — TypeScript types only (subscription, payment DTOs)

### Database

PostgreSQL via Docker (`docker-compose.yml`). Prisma schema at `prisma/schema.prisma`.

Key roles: `SystemRole` (USER | SUPER_ADMIN) lives on the `User` model. `TenantRole` (OWNER | ADMIN | STAFF | MEMBER) lives on the `TenantUser` join model — a user can have multiple roles per tenant.

## Known WIP / Incomplete Areas

- `validateTenantSubdomain()` — DB lookup is commented out, always returns `null`
- `src/features/auth/server/index.ts` — `CreateUser()` is empty
- `MembershipPlan` model — incomplete (no relations, no billing fields)
- `next-auth.d.ts` — type augmentation for session likely needs updating
