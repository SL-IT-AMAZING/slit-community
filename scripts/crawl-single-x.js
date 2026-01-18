#!/usr/bin/env node

import { fetchPostDetails, loadCookies, loadCookiesFromEnv } from "../src/lib/crawlers/screenshot-crawler.js";
import { getScreenshotDir, upsertCrawledContent } from "../src/lib/crawlers/index.js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const url = process.argv[2] || "https://x.com/leerob/status/2011810357942084085";

async function main() {
  const cookies = loadCookies("x") || loadCookiesFromEnv("x");

  if (!cookies) {
    console.log("No cookies found");
    return;
  }

  // URL에서 정보 추출
  const match = url.match(/x\.com\/([^/]+)\/status\/(\d+)/);
  if (!match) {
    console.log("Invalid URL");
    return;
  }

  const username = match[1];
  const tweetId = match[2];

  console.log(`Crawling: @${username} - ${tweetId}`);

  const screenshotInfo = getScreenshotDir("x");
  console.log("Screenshot dir:", screenshotInfo.dir);

  const postDetails = await fetchPostDetails("x", url, cookies, screenshotInfo);
  console.log("Post details:", JSON.stringify(postDetails, null, 2));

  // DB에 저장
  const item = {
    platform: "x",
    platform_id: tweetId,
    url: url,
    author_name: `@${username}`,
    author_url: `https://x.com/${username}`,
    screenshot_url: postDetails.screenshotUrl,
    status: "pending_analysis",
    raw_data: {
      screenshotUrls: postDetails.screenshotUrls || [],
      downloadedMedia: postDetails.downloadedMedia || [],
      mediaUrls: postDetails.mediaUrls || [],
      externalLinks: postDetails.externalLinks || [],
      youtubeUrl: postDetails.youtubeUrl || null,
      youtubeVideoId: postDetails.youtubeVideoId || null,
      youtubeEmbedUrl: postDetails.youtubeEmbedUrl || null,
    },
  };

  const { data, error } = await upsertCrawledContent([item]);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Saved:", data?.length || 1, "items");
    console.log("Record ID:", data?.[0]?.id);
  }
}

main().catch(console.error);
