import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import type { Provider } from "next-auth/providers";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string | null;
      status?: string | null;
    };
  }
}

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
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
  }),
  providers,
  session: {
    strategy: isLocalDev ? "jwt" : "database",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      // Block banned users
      const [dbUser] = await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      if (dbUser?.status === "banned") return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch role and status from DB on first sign-in
        if (user.id) {
          const [dbUser] = await db
            .select({ role: users.role, status: users.status })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);
          token.role = dbUser?.role ?? "lecturer";
          token.status = dbUser?.status ?? "active";
        }
      }
      return token;
    },
    async session({ session, token, user }) {
      if (token?.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as string | undefined;
        session.user.status = token.status as string | undefined;
      } else if (user) {
        session.user.id = user.id;
        // Fetch role and status from DB for database sessions
        const [dbUser] = await db
          .select({ role: users.role, status: users.status })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        session.user.role = dbUser?.role ?? "lecturer";
        session.user.status = dbUser?.status ?? "active";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      // If private mode is enabled, lock new users automatically
      try {
        const [setting] = await db
          .select({ value: systemSettings.value })
          .from(systemSettings)
          .where(eq(systemSettings.key, "privateModeEnabled"))
          .limit(1);
        if (setting?.value === true || setting?.value === "true") {
          await db
            .update(users)
            .set({ status: "locked" })
            .where(eq(users.id, user.id));
        }
      } catch {
        // Ignore errors (e.g., table not yet created during migrations)
      }
    },
  },
});
