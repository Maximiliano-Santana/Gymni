import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import db from "@/lib/prisma";
import { getTenantsBySubdomain } from "../../lib/auth";
import { headers } from "next/headers";

// Share cookies across subdomains so Google OAuth (which callbacks on the
// root domain) can set a session readable by tenant subdomains.
// Dev:  NEXTAUTH_URL=http://localhost:3000  → domain "localhost"
// Prod: NEXTAUTH_URL=https://gymni.app      → domain ".gymni.app"
function getCookieDomain(): string | undefined {
  if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN;
  const url = process.env.NEXTAUTH_URL;
  if (!url) return undefined;
  const host = new URL(url).hostname;
  return host === "localhost" ? "localhost" : `.${host}`;
}

const cookieDomain = getCookieDomain();
const useSecureCookies =
  process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const cookiePrefix = useSecureCookies ? "__Secure-" : "";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...(cookieDomain
    ? {
        cookies: {
          sessionToken: {
            name: `${cookiePrefix}next-auth.session-token`,
            options: {
              httpOnly: true,
              sameSite: "lax" as const,
              path: "/",
              secure: useSecureCookies,
              domain: cookieDomain,
            },
          },
          callbackUrl: {
            name: `${cookiePrefix}next-auth.callback-url`,
            options: {
              httpOnly: true,
              sameSite: "lax" as const,
              path: "/",
              secure: useSecureCookies,
              domain: cookieDomain,
            },
          },
        },
      }
    : {}),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "example@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(c) {
        if (!c?.email || !c?.password) return null;

        const user = await db.user.findUnique({
          where: { email: String(c.email) },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            systemRole: true,
          },
        });
        if (!user) return null;

        // User created via Google (no password) → can't login with credentials
        if (!user.password) return null;

        const ok = await bcrypt.compare(String(c.password), user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          systemRole: user.systemRole ?? "USER",
        } as any;
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ account }) {
      // allowDangerousEmailAccountLinking + PrismaAdapter handle account
      // linking and user creation automatically. TenantUser creation is
      // handled in the jwt callback where user.id is the real DB ID.
      if (account?.provider === "google") return true;
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.systemRole = (user as any).systemRole ?? undefined;
        // For Google users, systemRole won't be on the user object — look it up
        if (!token.systemRole) {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { systemRole: true },
          });
          token.systemRole = dbUser?.systemRole ?? "USER";
        }

        // Auto-create TenantUser if signing in from a tenant subdomain.
        // Done here (not in signIn) because user.id is guaranteed to be
        // the real DB ID after PrismaAdapter resolves the user.
        const h = await headers();
        const subdomain = h.get("x-tenant-subdomain");

        if (subdomain) {
          const tenant = await db.tenant.findUnique({
            where: { subdomain },
          });

          if (tenant) {
            const email = user.email ?? token.email;

            // Check for pending invitation
            const invitation = email
              ? await db.invitation.findFirst({
                  where: {
                    email,
                    tenantId: tenant.id,
                    usedAt: null,
                    expiresAt: { gt: new Date() },
                  },
                })
              : null;

            const role = invitation?.role ?? "MEMBER";

            const existingTenantUser = await db.tenantUser.findUnique({
              where: {
                userId_tenantId: { userId: user.id, tenantId: tenant.id },
              },
            });

            if (!existingTenantUser) {
              await db.tenantUser.create({
                data: {
                  userId: user.id,
                  tenantId: tenant.id,
                  roles: [role],
                },
              });
            }

            // Mark invitation as used
            if (invitation) {
              await db.invitation.update({
                where: { id: invitation.id },
                data: { usedAt: new Date() },
              });
            }
          }
        }

        token.tenants = await getTenantsBySubdomain(user.id);
      }

      // Allow client-side refresh: useSession().update({ refreshTenants: true })
      if (trigger === "update" && (session as any)?.refreshTenants) {
        const userId = token.sub!;
        token.tenants = await getTenantsBySubdomain(userId);
      }
      return token;
    },

    async redirect({ url, baseUrl }) {
      // Allow redirects to subdomains of the same base domain
      const base = new URL(baseUrl);
      try {
        const target = new URL(url);
        const baseParts = base.hostname.split(".");
        const targetParts = target.hostname.split(".");
        // Same host or subdomain of base (e.g. acme.localhost vs localhost)
        const baseRoot = baseParts.slice(-2).join(".");
        const targetRoot = targetParts.slice(-2).join(".");
        if (baseRoot === targetRoot || target.hostname.endsWith(`.${base.hostname}`)) {
          return url;
        }
      } catch {
        // Relative URL — prepend baseUrl
        if (url.startsWith("/")) return `${baseUrl}${url}`;
      }
      return baseUrl;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = String(token.sub);
        session.user.systemRole = token.systemRole ?? "USER";
        session.user.tenants = token.tenants ?? {};
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
