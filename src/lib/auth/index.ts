import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import type { Provider } from "next-auth/providers";

const isLocalDev = process.env.NODE_ENV === "development";

const providers: Provider[] = [
  GitHub({
    clientId: process.env.AUTH_GITHUB_ID!,
    clientSecret: process.env.AUTH_GITHUB_SECRET!,
  }),
];

if (isLocalDev) {
  providers.push(
    Credentials({
      id: "local-credentials",
      name: "Local Dev Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === "admin" &&
          credentials?.password === "admin"
        ) {
          // Ensure the dev user exists in the database
          const email = "admin@localhost";
          const existing = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existing.length > 0) {
            return {
              id: existing[0].id,
              email: existing[0].email,
              name: existing[0].name,
            };
          }

          // Create the dev user on first login
          const [newUser] = await db
            .insert(users)
            .values({
              email,
              name: "Local Admin",
              role: "admin",
            })
            .returning();

          return { id: newUser.id, email: newUser.email, name: newUser.name };
        }
        return null;
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers,
  session: {
    strategy: isLocalDev ? "jwt" : "database",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token, user }) {
      if (token?.id) {
        session.user.id = token.id as string;
      } else if (user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
