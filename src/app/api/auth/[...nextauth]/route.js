export const dynamic = "force-dynamic";

async function getSupabase() {
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  return getSupabaseAdmin();
}

function getAuthOptions() {
  const GoogleProvider = require("next-auth/providers/google").default;
  const GitHubProvider = require("next-auth/providers/github").default;
  const CredentialsProvider =
    require("next-auth/providers/credentials").default;

  return {
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
}

export async function GET(request, context) {
  try {
    const NextAuth = (await import("next-auth")).default;
    const authOptions = getAuthOptions();
    return await NextAuth(authOptions)(request, context);
  } catch (error) {
    console.error("[NextAuth] GET error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request, context) {
  try {
    const NextAuth = (await import("next-auth")).default;
    const authOptions = getAuthOptions();
    return await NextAuth(authOptions)(request, context);
  } catch (error) {
    console.error("[NextAuth] POST error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
