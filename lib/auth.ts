import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// NextAuth config (mirrors fieldcore-dashboard/lib/auth.ts). The Google ID
// token is persisted onto the JWT and exposed on the session so the server-side
// proxy routes can forward it to the FieldCore API as a Bearer token, which the
// backend verifies (service/auth.py) and maps to user_id "google:<sub>".
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  // App-specific cookie names so the chat (:3003) and dashboard (:3000) sessions
  // don't collide on the shared localhost domain (ports don't isolate cookies).
  cookies: {
    sessionToken: {
      name: "fc-chat.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    callbackUrl: {
      name: "fc-chat.callback-url",
      options: { sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    csrfToken: {
      name: "fc-chat.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.id_token) token.id_token = account.id_token;
      return token;
    },
    async session({ session, token }) {
      (session as any).id_token = (token as any).id_token;
      return session;
    },
  },
};
