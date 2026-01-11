import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const paymentKey = searchParams.get("paymentKey");
    const amount = searchParams.get("amount");
    const userId = searchParams.get("userId");
    const planId = searchParams.get("planId");

    if (!orderId || !paymentKey || !amount || !userId) {
      return NextResponse.redirect(
        new URL("/ko/premium?error=invalid_params", request.url)
      );
    }

    // Verify payment with Toss API
    const secretKey = process.env.TOSS_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.redirect(
        new URL("/ko/premium?error=toss_not_configured", request.url)
      );
    }

    const encryptedSecretKey = Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encryptedSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          paymentKey,
          amount: parseInt(amount),
        }),
      }
    );

    const paymentResult = await response.json();

    if (!response.ok) {
      console.error("Toss payment verification failed:", paymentResult);
      return NextResponse.redirect(
        new URL(`/ko/premium?error=${paymentResult.code}`, request.url)
      );
    }

    // Get Supabase client lazily
    const supabase = getSupabaseAdmin();

    // Payment successful - update user and create subscription
    const isYearly = planId?.includes("yearly");
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));

    // Update user to premium
    await supabase
      .from("users")
      .update({
        is_premium: true,
        subscription_tier: isYearly ? "yearly" : "monthly",
        subscription_end_date: endDate.toISOString(),
        toss_customer_id: paymentResult.customer?.id || null,
      })
      .eq("id", userId);

    // Create subscription record
    await supabase.from("subscriptions").insert({
      user_id: userId,
      plan: isYearly ? "yearly" : "monthly",
      payment_method: "toss",
      payment_id: paymentKey,
      status: "active",
      end_date: endDate.toISOString(),
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/ko/premium/success?orderId=${orderId}`, request.url)
    );
  } catch (error) {
    console.error("Toss success handler error:", error);
    return NextResponse.redirect(
      new URL("/ko/premium?error=server_error", request.url)
    );
  }
}
