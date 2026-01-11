import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: "2023-10-16",
  });
}

export async function POST(request) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      );
    }

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    // Get Supabase client lazily
    const supabase = getSupabaseAdmin();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;

        if (userId) {
          const isYearly = session.metadata?.plan === "yearly";
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));

          // Update user to premium
          await supabase
            .from("users")
            .update({
              is_premium: true,
              stripe_customer_id: session.customer,
              subscription_tier: session.metadata?.plan || "monthly",
              subscription_end_date: endDate.toISOString(),
            })
            .eq("id", userId);

          // Create subscription record
          await supabase.from("subscriptions").insert({
            user_id: userId,
            plan: session.metadata?.plan || "monthly",
            payment_method: "stripe",
            payment_id: session.subscription,
            status: "active",
            end_date: endDate.toISOString(),
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;

        // Find subscription by payment_id
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("payment_id", subscription.id)
          .single();

        if (subData) {
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status === "active" ? "active" : "cancelled",
              auto_renew: !subscription.cancel_at_period_end,
            })
            .eq("id", subData.id);

          // Update user premium status
          await supabase
            .from("users")
            .update({
              is_premium: subscription.status === "active",
            })
            .eq("id", subData.user_id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("payment_id", subscription.id)
          .single();

        if (subData) {
          await supabase
            .from("subscriptions")
            .update({
              status: "cancelled",
            })
            .eq("id", subData.id);

          // Remove premium status from user
          await supabase
            .from("users")
            .update({
              is_premium: false,
              subscription_tier: null,
              subscription_end_date: null,
            })
            .eq("id", subData.user_id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const { data: subData } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("payment_id", subscriptionId)
            .single();

          if (subData) {
            await supabase
              .from("subscriptions")
              .update({
                status: "expired",
              })
              .eq("id", subData.id);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
