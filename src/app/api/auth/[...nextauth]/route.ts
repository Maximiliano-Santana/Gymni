import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import db from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "example@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(c, req) {
        if (!c?.email || !c?.password) return null;

        const user = await db.user.findUnique({
          where: { email: String(c.email) },
          select: { id: true, email: true, name: true, password: true, systemRole: true },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(String(c.password), user.password);
        if (!ok) return null;

        // Devuelve shape de User; si extendiste tipos, incluye systemRole
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          systemRole: user.systemRole ?? "USER",
        } as any; // o tipa como `User`
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.systemRole = (user as any).systemRole ?? "USER";
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = String(token.sub);
        (session.user as any).systemRole = (token as any).systemRole ?? "USER";
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
