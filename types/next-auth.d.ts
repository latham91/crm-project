import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      role: "SUPER_ADMIN" | "ADMIN";
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    role: "SUPER_ADMIN" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "SUPER_ADMIN" | "ADMIN";
    username: string;
  }
}
