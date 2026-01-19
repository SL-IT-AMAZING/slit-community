#!/usr/bin/env node

import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

// Dynamic import to use the actual crawler
const { fetchPostDetails } = await import("../src/lib/crawlers/screenshot-crawler.js");
const { getScreenshotDir } = await import("../src/lib/crawlers/index.js");

// 쿠키 로드
const cookiePath = resolve(__dirname, "..", "cookies", "x.json");
const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));

// 스크린샷 디렉토리 설정
const screenshotInfo = getScreenshotDir("x");

console.log("=== YouTube 감지 테스트 ===");
console.log("대상: https://x.com/leerob/status/2011810357942084085");
console.log("");

try {
  const result = await fetchPostDetails(
    "x",
    "https://x.com/leerob/status/2011810357942084085",
    cookies,
    screenshotInfo
  );

  console.log("=== 결과 ===");
  console.log("mediaUrls:", result.mediaUrls);
  console.log("externalLinks:", result.externalLinks);
  console.log("hasVideo:", result.hasVideo);
  console.log("");
  console.log("=== YouTube 관련 ===");
  console.log("youtubeUrl:", result.youtubeUrl);
  console.log("youtubeVideoId:", result.youtubeVideoId);
  console.log("youtubeEmbedUrl:", result.youtubeEmbedUrl);
  console.log("");
  console.log("screenshotUrls:", result.screenshotUrls);

  if (result.youtubeVideoId) {
    console.log("");
    console.log("✅ YouTube 감지 성공!");
    console.log(`영상: https://www.youtube.com/watch?v=${result.youtubeVideoId}`);
    console.log(`임베드: ${result.youtubeEmbedUrl}`);
  } else {
    console.log("");
    console.log("❌ YouTube 감지 실패");
  }
} catch (error) {
  console.error("에러:", error.message);
}
