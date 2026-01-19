import { NextResponse } from "next/server";

// Dynamic imports to avoid build-time evaluation
async function getSession() {
  const { getServerSession } = await import("next-auth");
  const { getAuthOptions } = await import("@/lib/auth");
  const authOptions = await getAuthOptions();
  return getServerSession(authOptions);
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

    // Create Coinbase Commerce charge
    const response = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CC-Api-Key": process.env.COINBASE_API_KEY,
        "X-CC-Version": "2018-03-22",
      },
      body: JSON.stringify({
        name: planId === "yearly" ? "AI Community Yearly Subscription" : "AI Community Monthly Subscription",
        description: "Premium subscription for AI Community platform",
        pricing_type: "fixed_price",
        local_price: {
          amount: amount.toString(),
          currency: "USD",
        },
        metadata: {
          userId: session.user.id,
          planId,
          email: session.user.email,
        },
        redirect_url: `${baseUrl}/en/premium/success?provider=coinbase`,
        cancel_url: `${baseUrl}/en/premium?canceled=true`,
      }),
    });

    const chargeData = await response.json();

    if (!response.ok) {
      console.error("Coinbase charge creation failed:", chargeData);
      return NextResponse.json(
        { error: chargeData.error?.message || "Failed to create charge" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hosted_url: chargeData.data.hosted_url,
      charge_id: chargeData.data.id,
    });
  } catch (error) {
    console.error("Coinbase checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}
