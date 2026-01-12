import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// 플랫폼 → content.type 매핑
const PLATFORM_TO_TYPE = {
  youtube: "video",
  github: "open-source",
  trendshift: "open-source",
  reddit: "reddit",
  x: "x-thread",
  threads: "threads",
  linkedin: "linkedin",
};

// slug 생성
function generateSlug(title, platformId) {
  const base = title
    ? title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50)
    : platformId;
  return `${base}-${Date.now().toString(36)}`;
}

export async function POST(request) {
  try {
    const supabase = getSupabaseAdmin();
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    // 크롤링된 콘텐츠 조회
    const { data: items, error } = await supabase
      .from("crawled_content")
      .select("*")
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let published = 0;
    const errors = [];

    for (const item of items) {
      try {
        // content 테이블로 변환
        const contentData = {
          slug: generateSlug(item.title, item.platform_id),
          title: item.title || "(제목 없음)",
          description: item.description,
          body: item.content_text,
          type: PLATFORM_TO_TYPE[item.platform] || "article",
          category: item.digest_result?.category || "ai-tools",
          tags: item.digest_result?.tags || [],
          thumbnail_url: item.thumbnail_url,
          external_url: item.url,
          social_metadata: {
            ...item.raw_data,
            platform: item.platform,
          },
          platform_id: item.platform_id,
          author_info: {
            name: item.author_name,
            url: item.author_url,
            avatar: item.author_avatar,
          },
          status: "published",
          published_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from("content")
          .insert(contentData);

        if (insertError) {
          errors.push({ id: item.id, error: insertError.message });
          continue;
        }

        // 성공 시 crawled_content 삭제
        await supabase.from("crawled_content").delete().eq("id", item.id);
        published++;
      } catch (err) {
        errors.push({ id: item.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      published,
      total: items.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Publish API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish content" },
      { status: 500 }
    );
  }
}
