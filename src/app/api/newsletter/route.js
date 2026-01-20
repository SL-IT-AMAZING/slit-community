import { NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/services/supabase";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    const subscriber = await subscribeToNewsletter(email);

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed",
      data: { email: subscriber.email },
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);

    if (error.code === "23505") {
      return NextResponse.json({
        success: true,
        message: "Already subscribed",
      });
    }

    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 },
    );
  }
}
