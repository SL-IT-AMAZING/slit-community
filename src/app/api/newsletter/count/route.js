import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { count, error } = await supabase
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      count: count || 0,
      limit: 1000,
      remaining: Math.max(0, 1000 - (count || 0)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to get count" },
      { status: 500 },
    );
  }
}
