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

    // items가 비어있으면 명확한 메시지 반환
    if (!items || items.length === 0) {
      console.log("No items found for ids:", ids);
      return NextResponse.json(
        {
          error: "선택한 항목을 찾을 수 없습니다. 이미 게시되었거나 삭제되었을 수 있습니다.",
          published: 0,
          total: 0,
          ids: ids
        },
        { status: 404 }
      );
    }

    console.log(`Found ${items.length} items to publish`);
    let published = 0;
    const errors = [];

    for (const item of items) {
      try {
        // content 테이블로 변환
        // 번역된 제목이 있으면 한국어 제목으로 사용
        const koreanTitle = item.translated_title || item.title || "(제목 없음)";
        const englishTitle = item.translated_title ? item.title : null;

        const contentData = {
          slug: generateSlug(item.title, item.platform_id),
          title: koreanTitle,
          title_en: englishTitle,
          description: item.translated_content?.slice(0, 500) || item.description,
          description_en: item.translated_content ? item.description : null,
          body: item.translated_content || item.content_text,
          body_en: item.translated_content ? item.content_text : null,
          type: PLATFORM_TO_TYPE[item.platform] || "article",
          category: item.digest_result?.category || "ai-tools",
          tags: item.digest_result?.tags || [],
          thumbnail_url: item.thumbnail_url
            || item.raw_data?.downloadedMedia?.[0]
            || item.screenshot_url,
          external_url: item.url,
          social_metadata: {
            ...item.raw_data,
            platform: item.platform,
            // YouTube일 때 videoId 추가 (영상 재생에 필수)
            ...(item.platform === "youtube" && { videoId: item.platform_id }),
            // 번역 정보도 저장 (카드에서 사용)
            translatedTitle: item.translated_title,
            translatedContent: item.translated_content,
            // digest_result에서 metrics 정보 포함
            digest_result: item.digest_result,
          },
          platform_id: item.platform_id,
          author_info: {
            // author_name이 @로 시작하면 핸들로 분리
            name: item.author_name?.startsWith('@')
              ? item.author_name.slice(1) // @ 제거한 이름
              : item.author_name,
            handle: item.author_name?.startsWith('@')
              ? item.author_name // 핸들은 @username 형식 유지
              : null,
            url: item.author_url,
            avatar: item.author_avatar,
          },
          status: "published",
          // 원본 게시 시간이 있으면 사용, 없으면 현재 시간
          published_at: item.published_at || new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from("content")
          .insert(contentData);

        if (insertError) {
          console.error(`Failed to publish item ${item.id}:`, insertError);
          errors.push({ id: item.id, platform: item.platform, title: item.title, error: insertError.message });
          continue;
        }

        // 성공 시 crawled_content 삭제
        await supabase.from("crawled_content").delete().eq("id", item.id);
        published++;
        console.log(`Successfully published: ${item.platform} - ${item.title}`);
      } catch (err) {
        console.error(`Error processing item ${item.id}:`, err);
        errors.push({ id: item.id, error: err.message });
      }
    }

    console.log(`Publish complete: ${published}/${items.length} succeeded`);

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
