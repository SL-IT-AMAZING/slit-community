import { getAuthOptions } from "@/lib/auth";

async function getHandler() {
  const NextAuth = (await import("next-auth")).default;
  const authOptions = await getAuthOptions();
  return NextAuth(authOptions);
}

export async function GET(request, context) {
  const handler = await getHandler();
  return handler(request, context);
}

export async function POST(request, context) {
  const handler = await getHandler();
  return handler(request, context);
}
