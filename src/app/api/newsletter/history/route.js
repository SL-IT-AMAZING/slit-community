import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("newsletter_sends")
      .select("id, issue_number, subject, content, sent_at")
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ newsletters: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch history" },
      { status: 500 },
    );
  }
}
