import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Find user by username
          const user = await db
            .select()
            .from(users)
            .where(eq(users.username, credentials.username as string))
            .limit(1);

          if (!user.length) {
            return null;
          }

          const foundUser = user[0];

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password as string, foundUser.password);

          if (!isPasswordValid) {
            return null;
          }

          // Return user object (without password)
          return {
            id: foundUser.id,
            username: foundUser.username,
            email: foundUser.email,
            role: foundUser.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

// Helper function to check if user has required role
export function requireRole(requiredRole: "SUPER_ADMIN" | "ADMIN") {
  return async function middleware() {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    if (requiredRole === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      throw new Error("Insufficient permissions");
    }

    return session;
  };
}

// Helper function to check if user is super admin
export function requireSuperAdmin() {
  return requireRole("SUPER_ADMIN");
}

// Helper function to check if user is admin or super admin
export function requireAdmin() {
  return requireRole("ADMIN");
}
