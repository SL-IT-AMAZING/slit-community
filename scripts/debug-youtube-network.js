#!/usr/bin/env node

import { chromium } from "playwright";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

// 쿠키 로드
const cookiePath = resolve(__dirname, "..", "cookies", "x.json");
const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
});

// 쿠키 설정
const normalizedCookies = cookies.map((c) => {
  const cookie = {
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || "/",
  };
  if (c.secure !== undefined) cookie.secure = c.secure;
  if (c.httpOnly !== undefined) cookie.httpOnly = c.httpOnly;
  if (c.expirationDate) cookie.expires = c.expirationDate;
  if (c.sameSite === "no_restriction") cookie.sameSite = "None";
  if (c.sameSite === "lax") cookie.sameSite = "Lax";
  return cookie;
});
await context.addCookies(normalizedCookies);

const page = await context.newPage();

// 네트워크 요청 모니터링
const youtubeUrls = [];
page.on("response", async (response) => {
  const url = response.url();
  if (url.includes("youtube") || url.includes("youtu.be")) {
    youtubeUrls.push(url);
  }

  // API 응답에서 YouTube URL 찾기
  if (url.includes("/TweetDetail") || url.includes("/graphql")) {
    try {
      const text = await response.text();
      const matches = text.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/g);
      if (matches) {
        console.log("API 응답에서 발견:", matches);
      }
      const ytMatches = text.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g);
      if (ytMatches) {
        console.log("API 응답에서 발견 (youtube.com):", ytMatches);
      }
    } catch (e) {}
  }
});

await page.goto("https://x.com/leerob/status/2011810357942084085", {
  waitUntil: "domcontentloaded",
});

console.log("=== 페이지 로드 완료, 대기 중... ===");
await page.waitForTimeout(5000);

// 스크롤
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(2000);

console.log("\n=== 수집된 YouTube URL ===");
youtubeUrls.forEach(url => console.log(url));

// 페이지 HTML에서 YouTube 패턴 찾기
const htmlContent = await page.content();
const youtubePatterns = [
  /youtu\.be\/([a-zA-Z0-9_-]{11})/g,
  /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g,
];

console.log("\n=== HTML에서 YouTube 패턴 검색 ===");
youtubePatterns.forEach(pattern => {
  const matches = htmlContent.match(pattern);
  if (matches) {
    console.log("발견:", matches);
  }
});

// __NEXT_DATA__ 또는 window.__INITIAL_STATE__ 등 JSON 데이터 확인
const jsonData = await page.evaluate(() => {
  // Twitter의 초기 데이터 찾기
  const scripts = document.querySelectorAll("script");
  let twitterData = null;

  for (const script of scripts) {
    const text = script.textContent || "";
    if (text.includes("youtube") || text.includes("youtu.be")) {
      // YouTube 관련 부분만 추출
      const ytMatch = text.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      const ytMatch2 = text.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (ytMatch || ytMatch2) {
        return { found: true, match: ytMatch?.[0] || ytMatch2?.[0] };
      }
    }
  }

  return { found: false };
});

console.log("\n=== Script 태그 내 YouTube 데이터 ===");
console.log(JSON.stringify(jsonData, null, 2));

// amplify_video 정보 추출 (Twitter가 비디오를 호스팅하는 방식)
const videoInfo = await page.evaluate(() => {
  const videos = document.querySelectorAll("video");
  return Array.from(videos).map(v => ({
    poster: v.poster,
    // poster URL에서 amplify_video ID 추출
    amplifyId: v.poster?.match(/amplify_video_thumb\/(\d+)/)?.[1]
  }));
});

console.log("\n=== Video 요소 정보 ===");
console.log(JSON.stringify(videoInfo, null, 2));

// Twitter API에서 추가 데이터 찾기
const mediaInfo = await page.evaluate(() => {
  // data-video-id 또는 관련 속성 찾기
  const videoPlayers = document.querySelectorAll('[data-testid="videoPlayer"]');
  const result = [];

  videoPlayers.forEach((player, i) => {
    const parent = player.closest('[data-testid="tweet"]');
    const links = parent ? parent.querySelectorAll("a") : [];
    const linkData = Array.from(links).map(a => ({
      href: a.href,
      ariaLabel: a.getAttribute("aria-label")
    }));

    result.push({
      index: i,
      links: linkData.filter(l => l.ariaLabel?.includes("youtu") || l.href?.includes("youtu"))
    });
  });

  return result;
});

console.log("\n=== Video Player 링크 정보 ===");
console.log(JSON.stringify(mediaInfo, null, 2));

await browser.close();
