import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    // Ko-fi sends data as form-encoded with 'data' field containing JSON
    const formData = await request.formData();
    const dataString = formData.get("data");

    if (!dataString) {
      return NextResponse.json(
        { error: "Missing data field" },
        { status: 400 }
      );
    }

    const data = JSON.parse(dataString);

    // Verify the webhook token
    const verificationToken = process.env.KOFI_VERIFICATION_TOKEN;
    if (verificationToken && data.verification_token !== verificationToken) {
      console.error("Ko-fi webhook verification failed");
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 401 }
      );
    }

    const {
      type,
      email,
      is_subscription_payment,
      is_first_subscription_payment,
      tier_name,
      amount,
      currency,
      kofi_transaction_id,
      message,
    } = data;

    console.log(`Ko-fi webhook received: ${type}`, {
      email,
      tier_name,
      amount,
      is_subscription_payment,
    });

    // Handle subscription events
    if (is_subscription_payment) {
      const supabase = getSupabaseAdmin();

      // Find user by email
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, email, is_premium")
        .eq("email", email)
        .single();

      if (userError || !user) {
        console.error("User not found for email:", email);
        // Still return 200 to acknowledge webhook, but log the issue
        return NextResponse.json({
          success: true,
          message: "Webhook received but user not found",
          email,
        });
      }

      // Calculate subscription end date (1 month or 1 year based on tier)
      const endDate = new Date();
      const isYearly =
        tier_name?.toLowerCase().includes("year") ||
        tier_name?.toLowerCase().includes("annual");

      if (isYearly) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Update user's premium status
      const { error: updateError } = await supabase
        .from("users")
        .update({
          is_premium: true,
          subscription_tier: isYearly ? "yearly" : "monthly",
          subscription_end_date: endDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating user premium status:", updateError);
        return NextResponse.json(
          { error: "Failed to update user" },
          { status: 500 }
        );
      }

      // Create subscription record
      const { error: subError } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan: isYearly ? "yearly" : "monthly",
        payment_method: "kofi",
        payment_id: kofi_transaction_id,
        status: "active",
        end_date: endDate.toISOString(),
        auto_renew: true,
      });

      if (subError) {
        console.error("Error creating subscription record:", subError);
        // Don't fail the webhook, premium status is already updated
      }

      console.log(`User ${email} upgraded to premium (${tier_name})`);

      return NextResponse.json({
        success: true,
        message: "Subscription activated",
        userId: user.id,
        plan: isYearly ? "yearly" : "monthly",
        endDate: endDate.toISOString(),
      });
    }

    // Handle one-time donations (optional: could give temporary premium)
    if (type === "Donation") {
      console.log(`Donation received from ${email}: ${amount} ${currency}`);
      // Could implement: give 1 week premium for donations
    }

    // Handle subscription cancellation
    if (type === "Subscription Cancelled") {
      const supabase = getSupabaseAdmin();

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (user) {
        // Update subscription status but don't remove premium yet
        // Premium will expire at subscription_end_date
        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            auto_renew: false,
          })
          .eq("user_id", user.id)
          .eq("status", "active");

        console.log(`Subscription cancelled for ${email}`);
      }

      return NextResponse.json({
        success: true,
        message: "Subscription cancellation recorded",
      });
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("Ko-fi webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Ko-fi only uses POST
export async function GET() {
  return NextResponse.json({ message: "Ko-fi webhook endpoint" });
}
