export const dynamic = "force-dynamic";

const authOptions = {
  providers: [],
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

async function getHandler() {
  const { default: NextAuth } = await import("next-auth");
  const { default: GoogleProvider } =
    await import("next-auth/providers/google");
  const { default: GitHubProvider } =
    await import("next-auth/providers/github");

  authOptions.providers = [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
  ];

  return NextAuth(authOptions);
}

export async function GET(request) {
  const handler = await getHandler();
  return handler(request);
}

export async function POST(request) {
  const handler = await getHandler();
  return handler(request);
}
