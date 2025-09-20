// next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      systemRole: "USER" | "SUPER_ADMIN";
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    systemRole: "USER" | "SUPER_ADMIN";
  }

  interface JWT {
    sub?: string;
    systemRole?: "USER" | "SUPER_ADMIN";
  }
}
