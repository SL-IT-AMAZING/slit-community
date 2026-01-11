import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const supabaseAdmin = getSupabaseAdmin();

          // Use Supabase Auth to verify credentials
          const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error || !data.user) {
            return null;
          }

          // Get user profile from our users table
          const { data: profile } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", data.user.email)
            .single();

          return {
            id: profile?.id || data.user.id,
            email: data.user.email,
            name: profile?.display_name || data.user.user_metadata?.full_name,
            image: profile?.photo_url || data.user.user_metadata?.avatar_url,
            role: profile?.role || "user",
            isPremium: profile?.is_premium || false,
          };
        } catch (error) {
          console.error("Credentials auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, create/update user in our users table
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const supabaseAdmin = getSupabaseAdmin();
          await supabaseAdmin.from("users").upsert(
            {
              email: user.email,
              display_name: user.name,
              photo_url: user.image,
              provider: account.provider,
            },
            { onConflict: "email" }
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role ?? "user";
        token.isPremium = user.isPremium ?? false;
      }

      // Refresh user data from Supabase on session update
      if (trigger === "update" && token.email) {
        try {
          const supabaseAdmin = getSupabaseAdmin();
          const { data: profile } = await supabaseAdmin
            .from("users")
            .select("role, is_premium")
            .eq("email", token.email)
            .single();

          if (profile) {
            token.role = profile.role;
            token.isPremium = profile.is_premium;
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
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
