#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Dynamic imports
const { fetchPostDetails } = await import("../src/lib/crawlers/screenshot-crawler.js");
const { getScreenshotDir } = await import("../src/lib/crawlers/index.js");

// 쿠키 로드
const cookiePath = resolve(__dirname, "..", "cookies", "x.json");
const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));

const postUrl = "https://x.com/leerob/status/2011810357942084085";
const postId = "2011810357942084085";

console.log("=== leerob 트윗 크롤링 테스트 ===");
console.log("URL:", postUrl);
console.log("");

try {
  // 스크린샷 디렉토리 설정
  const screenshotInfo = getScreenshotDir("x");

  // 포스트 상세 정보 가져오기
  const postDetails = await fetchPostDetails("x", postUrl, cookies, screenshotInfo);

  console.log("=== 포스트 상세 정보 ===");
  console.log("hasVideo:", postDetails.hasVideo);
  console.log("youtubeUrl:", postDetails.youtubeUrl);
  console.log("youtubeVideoId:", postDetails.youtubeVideoId);
  console.log("youtubeEmbedUrl:", postDetails.youtubeEmbedUrl);
  console.log("screenshotUrl:", postDetails.screenshotUrl);
  console.log("");

  // DB에 저장할 데이터 구성
  const record = {
    platform: "x",
    platform_id: postId,
    url: postUrl,
    title: null, // 나중에 분석으로 채움
    description: null,
    content_text: null,
    author_name: "Lee Robinson",
    author_url: "https://x.com/leerob",
    author_avatar: null,
    thumbnail_url: postDetails.screenshotUrl,
    screenshot_url: postDetails.screenshotUrl,
    raw_data: {
      screenshotUrls: postDetails.screenshotUrls || [],
      downloadedMedia: postDetails.downloadedMedia || [],
      mediaUrls: postDetails.mediaUrls || [],
      externalLinks: postDetails.externalLinks || [],
      hasVideo: postDetails.hasVideo,
      // YouTube 관련 필드
      youtubeUrl: postDetails.youtubeUrl || null,
      youtubeVideoId: postDetails.youtubeVideoId || null,
      youtubeEmbedUrl: postDetails.youtubeEmbedUrl || null,
    },
    status: "pending_analysis",
    crawled_at: new Date().toISOString(),
  };

  console.log("=== DB 저장 데이터 ===");
  console.log(JSON.stringify(record, null, 2));

  // 기존 레코드 삭제
  const { error: deleteError } = await supabase
    .from("crawled_content")
    .delete()
    .eq("platform_id", postId);

  if (deleteError) {
    console.error("삭제 에러:", deleteError.message);
  }

  // DB에 저장
  const { data, error } = await supabase
    .from("crawled_content")
    .insert(record)
    .select();

  if (error) {
    console.error("저장 에러:", error.message);
  } else {
    console.log("");
    console.log("✅ DB 저장 완료!");
    console.log("ID:", data[0]?.id);
    console.log("");
    console.log("=== raw_data.youtubeEmbedUrl 확인 ===");
    console.log("youtubeEmbedUrl:", data[0]?.raw_data?.youtubeEmbedUrl);
  }
} catch (error) {
  console.error("에러:", error.message);
}
