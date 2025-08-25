import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Esta función se ejecuta cuando alguien intenta loguearse

        if (!credentials?.email || !credentials?.password) {
          return null; // Login fallido
        }

        // 1. Buscar usuario en BD
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null; // Usuario no existe
        }

        // 2. Verificar password
        const isPasswordValid = await bcrypt.compare(
          credentials.password, // Password que escribió el usuario
          user.hashedPassword // Password hasheado en BD
        );

        if (!isPasswordValid) {
          return null; // Password incorrecto
        }

        // 3. Login exitoso, retornar datos del usuario
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Se ejecuta cuando se crea o actualiza el JWT
      if (user) {
        // Primera vez que se loguea, agregar datos extra al token
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      // Se ejecuta cuando se accede a la sesión
      // Pasar datos del token a la sesión
      if (token) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
  },
};
