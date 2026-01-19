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
await page.goto("https://x.com/leerob/status/2011810357942084085", {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(5000);

// article 내부의 모든 링크 출력
const links = await page.evaluate(() => {
  const article = document.querySelector('article[data-testid="tweet"]');
  if (!article) return [];

  const links = article.querySelectorAll("a");
  return Array.from(links).map((a) => ({
    href: a.href,
    text: a.innerText?.slice(0, 100),
  }));
});

console.log("=== article 내 모든 링크 ===");
links.forEach((l, i) => {
  console.log(i + 1 + ". href:", l.href);
  console.log("   text:", l.text);
  console.log("");
});

// article 전체 텍스트에서 youtu.be 찾기
const articleText = await page.evaluate(() => {
  const article = document.querySelector('article[data-testid="tweet"]');
  return article?.innerText || "";
});

console.log("=== article 내 youtu.be 포함 여부 ===");
console.log("포함:", articleText.includes("youtu.be"));

// 페이지 전체에서 YouTube 관련 검색
const pageInfo = await page.evaluate(() => {
  const body = document.body.innerText || "";
  const allLinks = document.querySelectorAll("a");

  const youtubeLinks = [];
  allLinks.forEach((a) => {
    if (a.href.includes("youtube") || a.href.includes("youtu.be") ||
        a.innerText?.includes("youtu.be") || a.innerText?.includes("youtube")) {
      youtubeLinks.push({
        href: a.href,
        text: a.innerText?.slice(0, 100)
      });
    }
  });

  return {
    hasYoutubeInBody: body.includes("youtu.be") || body.includes("youtube.com"),
    youtubeLinks,
    bodyMatch: body.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  };
});

console.log("");
console.log("=== 페이지 전체 YouTube 검색 ===");
console.log("body에 YouTube 포함:", pageInfo.hasYoutubeInBody);
console.log("YouTube 링크 수:", pageInfo.youtubeLinks.length);
pageInfo.youtubeLinks.forEach((l, i) => {
  console.log("  " + (i+1) + ". " + l.href);
  console.log("     " + l.text);
});

if (pageInfo.bodyMatch) {
  console.log("Body 매칭:", pageInfo.bodyMatch[0]);
}

// 스크롤 후 다시 확인
console.log("");
console.log("=== 스크롤 후 확인 ===");
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(2000);

const afterScroll = await page.evaluate(() => {
  const body = document.body.innerText || "";
  return {
    hasYoutube: body.includes("youtu.be"),
    match: body.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  };
});

console.log("스크롤 후 YouTube 포함:", afterScroll.hasYoutube);
if (afterScroll.match) {
  console.log("매칭:", afterScroll.match[0]);
}

// 스크롤 후 YouTube 링크 다시 검색
const afterScrollLinks = await page.evaluate(() => {
  const allLinks = document.querySelectorAll("a");
  const youtubeLinks = [];

  allLinks.forEach((a) => {
    const href = a.href || "";
    const text = a.innerText || "";
    if (href.includes("youtube") || href.includes("youtu.be") ||
        text.includes("youtu.be") || text.includes("youtube")) {
      youtubeLinks.push({
        href: href,
        text: text.slice(0, 100)
      });
    }
  });

  // body에서 youtu.be URL 추출
  const bodyText = document.body.innerText || "";
  const youtubeMatch = bodyText.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);

  return { youtubeLinks, youtubeMatch };
});

console.log("");
console.log("=== 스크롤 후 YouTube 링크 ===");
console.log("링크 수:", afterScrollLinks.youtubeLinks.length);
afterScrollLinks.youtubeLinks.forEach((l, i) => {
  console.log("  " + (i+1) + ". " + l.href);
  console.log("     " + l.text);
});

if (afterScrollLinks.youtubeMatch) {
  console.log("");
  console.log("Body에서 찾은 YouTube:", "https://youtu.be/" + afterScrollLinks.youtubeMatch[1]);
}

// body 텍스트에서 youtu.be 주변 컨텍스트 출력
const youtubeContext = await page.evaluate(() => {
  const body = document.body.innerText || "";
  const idx = body.indexOf("youtu.be");
  if (idx >= 0) {
    return body.slice(Math.max(0, idx - 50), idx + 100);
  }
  return null;
});

console.log("");
console.log("=== youtu.be 주변 텍스트 ===");
console.log(youtubeContext);

// YouTube 카드 영역 검색
const cardInfo = await page.evaluate(() => {
  // "Visit youtu.be" 텍스트가 있는 요소 찾기
  const allElements = document.querySelectorAll("*");
  let cardElement = null;

  for (const el of allElements) {
    if (el.innerText?.includes("Visit youtu.be") && el.tagName !== "BODY") {
      cardElement = el;
      break;
    }
  }

  if (!cardElement) return { found: false };

  // 카드 요소의 부모들 중에서 링크 찾기
  let parent = cardElement;
  let link = null;
  for (let i = 0; i < 10; i++) {
    parent = parent.parentElement;
    if (!parent) break;

    // 부모에서 링크 찾기
    const links = parent.querySelectorAll("a");
    for (const a of links) {
      if (a.href && !a.href.includes("x.com") && !a.href.includes("twitter.com")) {
        link = a.href;
        break;
      }
    }
    if (link) break;
  }

  // 카드 주변의 모든 링크
  const nearbyLinks = [];
  const allLinks = document.querySelectorAll("a");
  allLinks.forEach((a) => {
    if (a.href && (a.href.includes("t.co") || a.href.includes("youtu"))) {
      nearbyLinks.push({ href: a.href, text: a.innerText?.slice(0, 50) });
    }
  });

  return {
    found: true,
    cardTag: cardElement.tagName,
    link,
    nearbyLinks
  };
});

console.log("");
console.log("=== YouTube 카드 분석 ===");
console.log(JSON.stringify(cardInfo, null, 2));

// video 및 iframe 요소 검색
const mediaElements = await page.evaluate(() => {
  const videos = document.querySelectorAll("video");
  const iframes = document.querySelectorAll("iframe");

  const videoInfo = Array.from(videos).map(v => ({
    src: v.src,
    currentSrc: v.currentSrc,
    poster: v.poster,
    dataAttrs: Object.fromEntries(
      Array.from(v.attributes)
        .filter(a => a.name.startsWith("data-"))
        .map(a => [a.name, a.value])
    )
  }));

  const iframeInfo = Array.from(iframes).map(i => ({
    src: i.src,
    dataAttrs: Object.fromEntries(
      Array.from(i.attributes)
        .filter(a => a.name.startsWith("data-"))
        .map(a => [a.name, a.value])
    )
  }));

  return { videos: videoInfo, iframes: iframeInfo };
});

console.log("");
console.log("=== Video/Iframe 요소 ===");
console.log(JSON.stringify(mediaElements, null, 2));

// data-testid 속성으로 카드 찾기
const cardByTestId = await page.evaluate(() => {
  const cards = document.querySelectorAll('[data-testid*="card"]');
  return Array.from(cards).map(c => ({
    testId: c.getAttribute("data-testid"),
    tagName: c.tagName,
    outerHTML: c.outerHTML.slice(0, 500)
  }));
});

console.log("");
console.log("=== data-testid 카드 ===");
console.log(JSON.stringify(cardByTestId, null, 2));

// 모든 data-testid 속성 출력
const allTestIds = await page.evaluate(() => {
  const elements = document.querySelectorAll("[data-testid]");
  return Array.from(elements).map(e => e.getAttribute("data-testid")).filter((v, i, a) => a.indexOf(v) === i);
});

console.log("");
console.log("=== 모든 data-testid ===");
console.log(allTestIds);

// 트윗 본문에서 URL 패턴 찾기 (숨겨진 href 포함)
const hiddenUrls = await page.evaluate(() => {
  const article = document.querySelector('article[data-testid="tweet"]');
  if (!article) return [];

  // 모든 요소의 모든 속성에서 URL 찾기
  const urls = [];
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_ELEMENT);

  while (walker.nextNode()) {
    const el = walker.currentNode;
    for (const attr of el.attributes) {
      if (attr.value.includes("youtube") || attr.value.includes("youtu.be")) {
        urls.push({ attr: attr.name, value: attr.value.slice(0, 200) });
      }
    }
  }

  return urls;
});

console.log("");
console.log("=== 숨겨진 YouTube URL ===");
console.log(JSON.stringify(hiddenUrls, null, 2));

await browser.close();
