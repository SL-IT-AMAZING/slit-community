import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: "2023-10-16",
  });
}

// Dynamic imports to avoid build-time evaluation
async function getSession() {
  const { getServerSession } = await import("next-auth");
  const { getAuthOptions } = await import("@/lib/auth");
  const authOptions = await getAuthOptions();
  return getServerSession(authOptions);
}

export async function POST(request) {
  try {
    const stripe = getStripe();

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      );
    }

    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { priceId, locale } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const localePrefix = locale || "ko";

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
      },
      success_url: `${baseUrl}/${localePrefix}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${localePrefix}/premium`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: locale === "ko" ? "ko" : "en",
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
