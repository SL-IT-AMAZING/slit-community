import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

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

function isEnglishTitle(title) {
  if (!title) return false;
  const koreanRegex = /[가-힣]/;
  return !koreanRegex.test(title);
}

async function translateToKorean(text) {
  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `다음 영어 제목을 자연스러운 한국어로 번역해주세요. 번역만 출력하고 다른 설명은 하지 마세요.\n\n"${text}"`,
        },
      ],
    });
    return response.content[0].text.trim().replace(/^["']|["']$/g, "");
  } catch (error) {
    console.error("Translation error:", error);
    return null;
  }
}

function generateYouTubeBody(digestResult) {
  if (!digestResult) return null;

  const parts = [];

  if (digestResult.keyQA) {
    const { question, answer, mechanism } = digestResult.keyQA;
    if (question && answer) {
      parts.push(`${question}\n`);
      parts.push(`${answer}\n\n`);
    }
    if (mechanism?.question && mechanism?.points) {
      parts.push(`${mechanism.question}\n`);
      mechanism.points.forEach((point) => {
        parts.push(`• ${point}\n`);
      });
      parts.push("\n");
    }
  }

  if (digestResult.intro) {
    parts.push(`${digestResult.intro}\n\n`);
  }

  if (digestResult.timeline) {
    parts.push(`${digestResult.timeline}\n\n`);
  }

  if (digestResult.recommendScore) {
    const score = digestResult.recommendScore;
    const reason = digestResult.recommendReason || "";
    const audience = digestResult.targetAudience || "";
    parts.push(`💡 추천 ${score}/10`);
    if (audience) {
      parts.push(` | ${audience}`);
    }
    if (reason) {
      parts.push(`\n${reason}`);
    }
    parts.push("\n");
  }

  return parts.length > 0 ? parts.join("").trim() : null;
}

export async function POST(request) {
  try {
    const supabase = getSupabaseAdmin();
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 },
      );
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
          error:
            "선택한 항목을 찾을 수 없습니다. 이미 게시되었거나 삭제되었을 수 있습니다.",
          published: 0,
          total: 0,
          ids: ids,
        },
        { status: 404 },
      );
    }

    console.log(`Found ${items.length} items to publish`);
    let published = 0;
    const errors = [];

    for (const item of items) {
      try {
        let koreanTitle = item.translated_title || item.title || "(제목 없음)";
        let englishTitle = item.translated_title ? item.title : null;
        let body = item.translated_content || item.content_text;
        let description =
          item.translated_content?.slice(0, 500) || item.description;

        if (item.platform === "youtube") {
          if (isEnglishTitle(item.title) && !item.translated_title) {
            const translated = await translateToKorean(item.title);
            if (translated) {
              koreanTitle = translated;
              englishTitle = item.title;
            }
          }

          const youtubeBody = generateYouTubeBody(item.digest_result);
          if (youtubeBody) {
            body = youtubeBody;
          }

          if (item.digest_result?.intro) {
            description = item.digest_result.intro.slice(0, 500);
          }
        }

        const contentData = {
          slug: generateSlug(koreanTitle, item.platform_id),
          title: koreanTitle,
          title_en: englishTitle,
          description: description,
          description_en: item.translated_content ? item.description : null,
          body: body,
          body_en: item.translated_content ? item.content_text : null,
          type: PLATFORM_TO_TYPE[item.platform] || "article",
          category: item.digest_result?.category || "ai-tools",
          tags: item.digest_result?.tags || [],
          thumbnail_url:
            item.thumbnail_url ||
            item.raw_data?.downloadedMedia?.[0] ||
            item.screenshot_url,
          external_url: item.url,
          social_metadata: {
            ...item.raw_data,
            platform: item.platform,
            ...(item.platform === "youtube" && { videoId: item.platform_id }),
            ...(item.platform === "reddit" && {
              subreddit: item.digest_result?.subreddit,
              score: item.digest_result?.metrics?.upvotes,
              num_comments: item.digest_result?.metrics?.comments,
            }),
            screenshotUrl: item.screenshot_url,
            translatedTitle: item.translated_title,
            translatedContent: item.translated_content,
            digest_result: item.digest_result,
          },
          platform_id: item.platform_id,
          author_info: {
            // author_name이 @로 시작하면 핸들로 분리
            name: item.author_name?.startsWith("@")
              ? item.author_name.slice(1) // @ 제거한 이름
              : item.author_name,
            handle: item.author_name?.startsWith("@")
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
          errors.push({
            id: item.id,
            platform: item.platform,
            title: item.title,
            error: insertError.message,
          });
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
      { status: 500 },
    );
  }
}
