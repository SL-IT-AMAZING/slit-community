import { NextResponse } from "next/server";

// Dynamic import to avoid build-time evaluation
async function getSession() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  return getServerSession(authOptions);
}

function generateOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { planId, amount } = await request.json();

    if (!planId || !amount) {
      return NextResponse.json(
        { error: "Plan ID and amount are required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const orderId = `order_${generateOrderId()}`;

    // Toss Payments requires client-side initialization
    // Return the payment configuration for the client
    const paymentConfig = {
      clientKey: process.env.TOSS_CLIENT_KEY,
      orderId,
      orderName: planId === "yearly_79000" ? "AI Community 연간 구독" : "AI Community 월간 구독",
      amount,
      customerEmail: session.user.email,
      customerName: session.user.name || "회원",
      successUrl: `${baseUrl}/ko/api/checkout/toss/success?orderId=${orderId}&userId=${session.user.id}&planId=${planId}`,
      failUrl: `${baseUrl}/ko/premium?error=payment_failed`,
      metadata: {
        userId: session.user.id,
        planId,
      },
    };

    return NextResponse.json(paymentConfig);
  } catch (error) {
    console.error("Toss checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}
