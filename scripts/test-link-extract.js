import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

// Cookie-Editor 형식을 Playwright 형식으로 변환
function normalizeCookies(cookies) {
  return cookies.map((cookie) => {
    const normalized = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || "/",
    };
    if (cookie.sameSite === "no_restriction") normalized.sameSite = "None";
    else if (cookie.sameSite === "lax") normalized.sameSite = "Lax";
    else if (cookie.sameSite === "strict") normalized.sameSite = "Strict";
    if (cookie.secure !== undefined) normalized.secure = cookie.secure;
    if (cookie.httpOnly !== undefined) normalized.httpOnly = cookie.httpOnly;
    if (cookie.expirationDate) normalized.expires = cookie.expirationDate;
    return normalized;
  });
}

async function testLinkExtract() {
  console.log("=== Threads 링크 추출 테스트 ===\n");

  const cookiePath = path.join(process.cwd(), "cookies", "threads.json");
  const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  });

  await context.addCookies(normalizeCookies(cookies));

  const page = await context.newPage();
  await page.goto("https://www.threads.com/@qjc.ai/post/DTedQ3qj86J", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(4000);

  // 모든 링크 추출 (필터 없이)
  const links = await page.evaluate(() => {
    const allLinks = [];
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.href;
      const text = a.innerText?.trim().slice(0, 100);
      if (href && href.startsWith("http")) {
        allLinks.push({ href, text });
      }
    });
    return allLinks;
  });

  console.log(`총 ${links.length}개 링크 발견\n`);

  // 특정 키워드 포함 링크 출력
  const interestingLinks = links.filter(l =>
    l.href.includes("tally") ||
    l.text?.includes("tally") ||
    l.href.includes("l.threads") ||
    l.text?.toLowerCase().includes("http")
  );

  console.log("관심 링크 (tally 등):");
  interestingLinks.forEach((link, i) => {
    console.log(`${i + 1}. ${link.href}`);
    if (link.text) console.log(`   표시: ${link.text}`);
  });

  // 텍스트에서 URL 패턴 추출
  const textContent = await page.evaluate(() => document.body.innerText);
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const textUrls = textContent.match(urlPattern) || [];

  console.log("\n텍스트에서 추출된 URL:");
  [...new Set(textUrls)].forEach((url, i) => {
    console.log(`${i + 1}. ${url}`);
  });

  await browser.close();
}

testLinkExtract();
