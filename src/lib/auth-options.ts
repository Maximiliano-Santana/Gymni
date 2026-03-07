import { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import db from "@/lib/prisma";
import { getTenantsBySubdomain } from "@/app/api/lib/auth";
import { getSubdomain } from "@/features/tenants/lib";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
            emailVerified: true,
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
          emailVerified: !!user.emailVerified,
        } as any;
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email;
      if (!email) return false;

      // Account linking: if a user with this email already exists (e.g. from credentials),
      // link the Google account to the existing user instead of creating a new one.
      const existingUser = await db.user.findUnique({
        where: { email },
        include: { accounts: true },
      });

      if (existingUser) {
        // Check if this Google account is already linked
        const alreadyLinked = existingUser.accounts.some(
          (a) =>
            a.provider === account.provider &&
            a.providerAccountId === account.providerAccountId
        );

        if (!alreadyLinked) {
          await db.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token ?? null,
              access_token: account.access_token ?? null,
              expires_at: account.expires_at ?? null,
              token_type: account.token_type ?? null,
              scope: account.scope ?? null,
              id_token: account.id_token ?? null,
              session_state: account.session_state
                ? String(account.session_state)
                : null,
            },
          });
        }

        // Google-verified email — mark as verified if not already
        if (!existingUser.emailVerified) {
          await db.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: new Date() },
          });
        }

        // Mutate user.id so the jwt callback gets the correct existing user ID
        user.id = existingUser.id;
      }

      // Auto-create TenantUser with MEMBER role if logging in from a tenant subdomain
      const subdomain = await getSubdomain();

      if (subdomain) {
        const tenant = await db.tenant.findUnique({
          where: { subdomain },
        });

        if (tenant) {
          const userId = existingUser?.id ?? user.id;

          // Check for pending invitation
          const invitation = await db.invitation.findFirst({
            where: {
              email,
              tenantId: tenant.id,
              usedAt: null,
              expiresAt: { gt: new Date() },
            },
          });

          const role = invitation?.role ?? "MEMBER";

          const existingTenantUser = await db.tenantUser.findUnique({
            where: {
              userId_tenantId: { userId, tenantId: tenant.id },
            },
          });

          if (!existingTenantUser) {
            await db.tenantUser.create({
              data: {
                userId,
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

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.systemRole = (user as any).systemRole ?? undefined;
        token.emailVerified = (user as any).emailVerified ?? false;
        // For Google users, systemRole won't be on the user object — look it up
        if (!token.systemRole) {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { systemRole: true, emailVerified: true },
          });
          token.systemRole = dbUser?.systemRole ?? "USER";
          token.emailVerified = !!dbUser?.emailVerified;
        }
        token.picture = user.image ?? undefined;
        token.tenants = await getTenantsBySubdomain(user.id);
      }

      // Backfill emailVerified for JWTs created before the verification feature
      if (token.emailVerified === undefined && token.sub) {
        const dbUser = await db.user.findUnique({
          where: { id: token.sub },
          select: { emailVerified: true },
        });
        token.emailVerified = !!dbUser?.emailVerified;
      }

      // Allow client-side refresh: useSession().update({ refreshTenants: true })
      if (trigger === "update" && (session as any)?.refreshTenants) {
        const userId = token.sub!;
        token.tenants = await getTenantsBySubdomain(userId);
        // Refresh image too
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: { image: true },
        });
        token.picture = dbUser?.image ?? undefined;
      }

      // Allow client-side refresh after email verification
      if (trigger === "update" && (session as any)?.refreshEmailVerified) {
        const dbUser = await db.user.findUnique({
          where: { id: token.sub! },
          select: { emailVerified: true },
        });
        token.emailVerified = !!dbUser?.emailVerified;
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
        session.user.image = (token.picture as string) ?? null;
        session.user.systemRole = token.systemRole ?? "USER";
        session.user.tenants = token.tenants ?? {};
        session.user.emailVerified = token.emailVerified ?? false;
      }
      return session;
    },
  },
};
