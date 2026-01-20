export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getSupabase() {
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  return getSupabaseAdmin();
}

async function getAuthConfig() {
  const [nextAuthMod, googleMod, githubMod, credentialsMod] = await Promise.all(
    [
      import("next-auth"),
      import("next-auth/providers/google"),
      import("next-auth/providers/github"),
      import("next-auth/providers/credentials"),
    ],
  );

  const NextAuth = nextAuthMod.default;
  const GoogleProvider = googleMod.default;
  const GitHubProvider = githubMod.default;
  const CredentialsProvider = credentialsMod.default;

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
            const supabaseAdmin = await getSupabase();

            const { data, error } = await supabaseAdmin.auth.signInWithPassword(
              {
                email: credentials.email,
                password: credentials.password,
              },
            );

            if (error || !data.user) {
              return null;
            }

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

  return { NextAuth, authOptions };
}

export async function GET(request, context) {
  const { NextAuth, authOptions } = await getAuthConfig();
  return NextAuth(request, context, authOptions);
}

export async function POST(request, context) {
  const { NextAuth, authOptions } = await getAuthConfig();
  return NextAuth(request, context, authOptions);
}
