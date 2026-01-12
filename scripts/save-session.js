/**
 * SNS 세션 저장 스크립트
 *
 * 사용법:
 * node scripts/save-session.js x       # X (Twitter) 로그인
 * node scripts/save-session.js threads # Threads 로그인
 *
 * 브라우저가 열리면 수동으로 로그인하고, 완료되면 터미널에서 Enter 키를 누르세요.
 * 쿠키가 cookies/{platform}.json에 저장됩니다.
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const PLATFORMS = {
  x: {
    name: "X (Twitter)",
    url: "https://twitter.com/login",
    feedUrl: "https://twitter.com/home",
  },
  threads: {
    name: "Threads",
    url: "https://www.threads.net/login",
    feedUrl: "https://www.threads.net/",
  },
};

async function saveSession(platform) {
  const config = PLATFORMS[platform];

  if (!config) {
    console.error(`Unknown platform: ${platform}`);
    console.log("Available platforms:", Object.keys(PLATFORMS).join(", "));
    process.exit(1);
  }

  console.log(`\n=== ${config.name} 세션 저장 ===\n`);
  console.log("1. 브라우저가 열립니다.");
  console.log("2. 로그인을 완료하세요.");
  console.log("3. 피드 페이지가 정상적으로 로드되면 터미널로 돌아와서 Enter를 누르세요.\n");

  // 브라우저 실행 (headful 모드)
  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    viewport: null, // 전체 화면
  });

  const page = await context.newPage();

  // 로그인 페이지로 이동
  await page.goto(config.url);

  // 사용자가 로그인할 때까지 대기
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise((resolve) => {
    rl.question("로그인을 완료한 후 Enter를 누르세요...", () => {
      rl.close();
      resolve();
    });
  });

  // 쿠키 저장
  const cookies = await context.cookies();

  // 쿠키 디렉토리 생성
  const cookieDir = path.join(process.cwd(), "cookies");
  if (!fs.existsSync(cookieDir)) {
    fs.mkdirSync(cookieDir, { recursive: true });
  }

  // 쿠키 파일 저장
  const cookiePath = path.join(cookieDir, `${platform}.json`);
  fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));

  console.log(`\n쿠키가 저장되었습니다: ${cookiePath}`);
  console.log(`쿠키 개수: ${cookies.length}개\n`);

  // 환경변수용 출력 (선택사항)
  console.log("--- GitHub Secrets 용 (선택사항) ---");
  console.log(`${platform.toUpperCase()}_COOKIES='${JSON.stringify(cookies)}'`);
  console.log("-----------------------------------\n");

  // 피드 페이지 테스트
  console.log("피드 페이지 로드 테스트 중...");
  await page.goto(config.feedUrl, { waitUntil: "networkidle" });

  const screenshotPath = path.join(cookieDir, `${platform}_test.png`);
  await page.screenshot({ path: screenshotPath });
  console.log(`테스트 스크린샷 저장: ${screenshotPath}\n`);

  await browser.close();

  console.log("완료!");
}

// 실행
const platform = process.argv[2];

if (!platform) {
  console.log("사용법: node scripts/save-session.js <platform>");
  console.log("Available platforms:", Object.keys(PLATFORMS).join(", "));
  process.exit(1);
}

saveSession(platform);
