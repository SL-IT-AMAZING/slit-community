import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function handler(req) {
  const { default: NextAuth } = await import("next-auth");
  const { default: GoogleProvider } =
    await import("next-auth/providers/google");
  const { default: GitHubProvider } =
    await import("next-auth/providers/github");

  const authOptions = {
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      }),
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID ?? "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      }),
    ],
    pages: {
      signIn: "/login",
      error: "/login",
    },
    callbacks: {
      async signIn() {
        return true;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub;
          session.user.role = token.role ?? "user";
          session.user.isPremium = token.isPremium ?? false;
        }
        return session;
      },
      async jwt({ token }) {
        token.role = token.role ?? "user";
        token.isPremium = token.isPremium ?? false;
        return token;
      },
    },
    session: {
      strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
  };

  const authHandler = NextAuth(authOptions);

  return authHandler(req, {
    params: { nextauth: req.nextUrl.pathname.split("/").slice(3) },
  });
}

export { handler as GET, handler as POST };
