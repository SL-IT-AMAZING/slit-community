#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function publishContent(ids) {
  // 크롤링된 콘텐츠 조회
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
        console.error(`Failed to publish item ${item.id}:`, insertError.message);
        continue;
      }

      // 성공 시 crawled_content 삭제
      await supabase.from("crawled_content").delete().eq("id", item.id);
      published++;
      console.log(`✅ Published: [${item.platform}] ${item.title}`);
    } catch (err) {
      console.error(`Error processing item ${item.id}:`, err.message);
    }
  }

  console.log(`\n=== 게시 완료: ${published}/${items.length} ===`);
}

// 게시 대상 ID 목록
const ids = [
  "ec37be6d-efae-44a0-bc3a-894285a6b8f4",
  "3c7dd358-3901-44ae-81bc-daf7450e981c",
  "f2841246-a455-4b67-b958-04574c1481a1",
  "4fb312d0-d013-43f0-8a1c-8a2071e9700c",
  "3a842505-6d91-47ed-bbda-bd1f406ccb7e",
  "cc08a4c3-b290-4586-8137-2fa5e882dac8",
  "bad2e1bb-1a79-4619-9e11-3ef2fa53f49c",
  "157664ce-ec29-4c02-94bf-d252ad5b3828",
  "be06e5e0-3aee-4de6-a362-353b2a469664",
  "b4a0c91b-b566-445e-8efb-9a3958a6fed0",
  "6c3486df-a4c6-4f40-b676-71d4d4e3893e",
  "14008c7f-279a-49b5-a9c2-243cdceff68a",
];

publishContent(ids);
