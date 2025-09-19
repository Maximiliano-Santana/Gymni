// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import db from "@/lib/prisma";

const handler = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "example@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(c) {
        if (!c?.email || !c?.password) return null;
        const user = await db.user.findUnique({ where: { email: String(c.email) } });
        if (!user) throw new Error("User not found");
        const ok = await bcrypt.compare(String(c.password), user.password); // usa 'hash' en tu schema
        if(ok){
            return { id: user.id, email: user.email, name: user.name }
        }else{
            throw new Error("Wrong Password");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  }
});

export { handler as GET, handler as POST };
