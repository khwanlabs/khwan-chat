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
