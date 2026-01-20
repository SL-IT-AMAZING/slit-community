import { getAuthOptions } from "@/lib/auth";

async function getHandler() {
  const NextAuth = (await import("next-auth")).default;
  const authOptions = await getAuthOptions();
  return NextAuth(authOptions);
}

export async function GET(request, context) {
  try {
    const handler = await getHandler();
    return handler(request, context);
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
    const handler = await getHandler();
    return handler(request, context);
  } catch (error) {
    console.error("[NextAuth] POST error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
