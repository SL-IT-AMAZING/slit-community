import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots");

// Cookie-Editor 형식을 Playwright 형식으로 변환
function normalizeCookies(cookies) {
  return cookies.map((cookie) => {
    const normalized = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || "/",
    };
    if (cookie.sameSite === "no_restriction") {
      normalized.sameSite = "None";
    } else if (cookie.sameSite === "lax") {
      normalized.sameSite = "Lax";
    } else if (cookie.sameSite === "strict") {
      normalized.sameSite = "Strict";
    }
    if (cookie.secure !== undefined) normalized.secure = cookie.secure;
    if (cookie.httpOnly !== undefined) normalized.httpOnly = cookie.httpOnly;
    if (cookie.expirationDate) normalized.expires = cookie.expirationDate;
    return normalized;
  });
}

async function testClipScreenshot(platform, url) {
  console.log(`\n=== ${platform} 클립 스크린샷 테스트 ===`);

  // 쿠키 로드
  const cookiePath = path.join(process.cwd(), "cookies", `${platform}.json`);
  if (!fs.existsSync(cookiePath)) {
    console.log(`쿠키 파일 없음: ${cookiePath}`);
    return;
  }
  const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }, // 높이 1/2
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });

    if (cookies && cookies.length > 0) {
      await context.addCookies(normalizeCookies(cookies));
    }

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(4000);

    // 클립 설정
    // Threads: 왼쪽 여백 ~300px, 오른쪽 여백 ~300px → 중앙 680px 영역
    // X: 왼쪽 여백 ~280px, 오른쪽 여백 ~400px → 중앙 600px 영역
    const clipConfig = platform === "threads"
      ? { x: 300, y: 0, width: 680, height: 800 }
      : { x: 280, y: 0, width: 600, height: 800 };

    // 1. 상단 캡처 (클립)
    const filename1 = `${platform}_clip_top.png`;
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, filename1),
      clip: clipConfig,
    });
    console.log(`저장: ${filename1} (상단)`);

    // 2. 스크롤 후 하단 캡처
    await page.evaluate(() => window.scrollBy(0, 700)); // 700px 스크롤
    await page.waitForTimeout(1000);

    const filename2 = `${platform}_clip_bottom.png`;
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, filename2),
      clip: clipConfig,
    });
    console.log(`저장: ${filename2} (하단)`);

    await browser.close();
    console.log(`완료!`);

  } catch (error) {
    await browser.close();
    console.error(`에러: ${error.message}`);
  }
}

// Threads 테스트
await testClipScreenshot("threads", "https://www.threads.com/@qjc.ai/post/DTedQ3qj86J");

// X 테스트
await testClipScreenshot("x", "https://x.com/elonmusk/status/2011324998653513810");

console.log("\n=== 테스트 완료 ===");
console.log("생성된 파일:");
console.log("- threads_clip_test_full.png (전체)");
console.log("- threads_clip_test_cropped.png (클립)");
console.log("- x_clip_test_full.png (전체)");
console.log("- x_clip_test_cropped.png (클립)");
