import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

async function getSupabase() {
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  return getSupabaseAdmin();
}

export const authOptions = {
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
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const supabaseAdmin = await getSupabase();
          await supabaseAdmin.from("users").upsert(
            {
              email: user.email,
              display_name: user.name,
              photo_url: user.image,
              provider: account.provider,
            },
            { onConflict: "email" },
          );
        } catch (error) {
          console.error("Error syncing user to Supabase:", error);
        }
      }
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
    async jwt({ token, user, trigger, account }) {
      if (user || trigger === "update" || (account && !token.role)) {
        try {
          const supabaseAdmin = await getSupabase();
          const { data: profile } = await supabaseAdmin
            .from("users")
            .select("role, is_premium")
            .eq("email", token.email)
            .single();

          if (profile) {
            token.role = profile.role;
            token.isPremium = profile.is_premium;
          } else {
            token.role = "user";
            token.isPremium = false;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          token.role = token.role ?? "user";
          token.isPremium = token.isPremium ?? false;
        }
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
