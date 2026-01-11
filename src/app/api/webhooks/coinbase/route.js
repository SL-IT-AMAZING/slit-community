import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("x-cc-webhook-signature");

    // Verify webhook signature
    const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Coinbase is not configured" },
        { status: 503 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Coinbase webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const { type, data } = event.event;

    // Get Supabase client lazily
    const supabase = getSupabaseAdmin();

    switch (type) {
      case "charge:confirmed": {
        const { metadata, id: chargeId } = data;
        const userId = metadata?.userId;
        const planId = metadata?.planId;

        if (userId) {
          const isYearly = planId === "yearly";
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));

          // Update user to premium
          await supabase
            .from("users")
            .update({
              is_premium: true,
              subscription_tier: isYearly ? "yearly" : "monthly",
              subscription_end_date: endDate.toISOString(),
            })
            .eq("id", userId);

          // Create subscription record
          await supabase.from("subscriptions").insert({
            user_id: userId,
            plan: isYearly ? "yearly" : "monthly",
            payment_method: "coinbase",
            payment_id: chargeId,
            status: "active",
            end_date: endDate.toISOString(),
          });
        }
        break;
      }

      case "charge:failed": {
        const { metadata, id: chargeId } = data;
        const userId = metadata?.userId;

        if (userId) {
          console.log(
            `Coinbase payment failed for user ${userId}, charge ${chargeId}`
          );
        }
        break;
      }

      case "charge:pending": {
        console.log("Coinbase payment pending:", data.id);
        break;
      }

      default:
        console.log(`Unhandled Coinbase event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Coinbase webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
