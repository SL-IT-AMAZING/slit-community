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

async function testPublish() {
  // pending 상태 레코드 조회
  const { data: pendingItems, error: fetchError } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("platform", "github")
    .eq("status", "pending")
    .limit(1);

  if (fetchError) {
    console.error("조회 에러:", fetchError.message);
    return;
  }

  if (!pendingItems || pendingItems.length === 0) {
    console.log("게시할 pending 레코드가 없습니다.");
    return;
  }

  const item = pendingItems[0];
  console.log("=== 게시 테스트 대상 ===");
  console.log("ID:", item.id);
  console.log("제목:", item.title);
  console.log("URL:", item.url);
  console.log("");

  // content 테이블로 변환
  const contentData = {
    slug: generateSlug(item.title, item.platform_id),
    title: item.title,
    title_en: null,
    description: item.translated_content?.slice(0, 500) || item.description,
    description_en: item.translated_content ? item.description : null,
    body: item.translated_content || item.content_text,
    body_en: item.translated_content ? item.content_text : null,
    type: "open-source",
    category: item.digest_result?.categories?.[0] || "ai-tools",
    tags: item.digest_result?.categories || [],
    thumbnail_url: item.screenshot_url,
    external_url: item.url,
    social_metadata: {
      ...item.raw_data,
      platform: "github",
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

  console.log("=== 변환된 content 데이터 ===");
  console.log("slug:", contentData.slug);
  console.log("title:", contentData.title);
  console.log("type:", contentData.type);
  console.log("category:", contentData.category);
  console.log("tags:", contentData.tags);
  console.log("");

  // content 테이블에 저장
  const { data: insertedContent, error: insertError } = await supabase
    .from("content")
    .insert(contentData)
    .select();

  if (insertError) {
    console.error("게시 에러:", insertError.message);
    return;
  }

  console.log("✅ content 테이블 저장 완료");
  console.log("저장된 ID:", insertedContent[0]?.id);
  console.log("");

  // crawled_content 삭제
  const { error: deleteError } = await supabase
    .from("crawled_content")
    .delete()
    .eq("id", item.id);

  if (deleteError) {
    console.error("삭제 에러:", deleteError.message);
  } else {
    console.log("✅ crawled_content 삭제 완료");
  }

  console.log("");
  console.log("=== 게시 테스트 완료 ===");

  // 결과 확인
  const { data: contentRecord } = await supabase
    .from("content")
    .select("*")
    .eq("slug", contentData.slug)
    .single();

  console.log("");
  console.log("=== 저장된 content 레코드 ===");
  console.log(JSON.stringify(contentRecord, null, 2));
}

testPublish();
