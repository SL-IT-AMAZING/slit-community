import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve("/Users/ownuun/conductor/workspaces/v2-v1/kiev", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLATFORM_TO_TYPE = {
  youtube: "video",
  github: "open-source",
  trendshift: "open-source",
  reddit: "reddit",
  x: "x-thread",
  threads: "threads",
  linkedin: "linkedin",
};

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

async function publishContent(ids) {
  console.log(`Fetching ${ids.length} items...`);
  
  const { data: items, error } = await supabase
    .from("crawled_content")
    .select("*")
    .in("id", ids);

  if (error) {
    console.error("Error fetching items:", error.message);
    return;
  }

  if (!items || items.length === 0) {
    console.log("No items found");
    return;
  }

  console.log(`Found ${items.length} items to publish`);
  let published = 0;
  let failed = 0;

  for (const item of items) {
    try {
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
        category: item.digest_result?.categories?.[0] || "ai-tools",
        tags: item.digest_result?.categories || [],
        thumbnail_url: item.thumbnail_url,
        external_url: item.url,
        social_metadata: {
          ...item.raw_data,
          platform: item.platform,
          translatedTitle: item.translated_title,
          translatedContent: item.translated_content,
          digest_result: item.digest_result,
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
        console.error(`❌ [${item.platform}] ${item.title?.slice(0,40)}: ${insertError.message}`);
        failed++;
        continue;
      }

      await supabase.from("crawled_content").delete().eq("id", item.id);
      published++;
      
      if (published % 20 === 0) {
        console.log(`Progress: ${published}/${items.length} published...`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== 게시 완료 ===`);
  console.log(`✅ 성공: ${published}`);
  console.log(`❌ 실패: ${failed}`);
}

const ids = JSON.parse(readFileSync("/tmp/publish_ids.json", "utf-8"));
publishContent(ids);
