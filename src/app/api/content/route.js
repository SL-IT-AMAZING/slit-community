import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PLATFORM_TYPE_MAP = {
  youtube: "video",
  x: "x-thread",
  linkedin: "linkedin",
  threads: "threads",
  github: "open-source",
  reddit: "reddit",
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const platform = searchParams.get("platform");

  try {
    const supabase = await createClient();

    let query = supabase
      .from("content")
      .select("*, social_metadata, author_info", { count: "exact" })
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform && PLATFORM_TYPE_MAP[platform]) {
      query = query.eq("type", PLATFORM_TYPE_MAP[platform]);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      hasMore: offset + limit < count,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 },
    );
  }
}
