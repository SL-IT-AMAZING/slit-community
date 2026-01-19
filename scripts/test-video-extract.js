import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cookiePath = path.resolve(__dirname, '..', 'cookies', 'x.json');
const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));

function normalizeCookies(cookies) {
  return cookies.map((cookie) => {
    const normalized = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
    };
    if (cookie.sameSite === 'no_restriction') normalized.sameSite = 'None';
    else if (cookie.sameSite === 'lax') normalized.sameSite = 'Lax';
    else if (cookie.sameSite === 'strict') normalized.sameSite = 'Strict';
    if (cookie.secure !== undefined) normalized.secure = cookie.secure;
    if (cookie.httpOnly !== undefined) normalized.httpOnly = cookie.httpOnly;
    return normalized;
  });
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(normalizeCookies(cookies));
  const page = await context.newPage();

  let videoUrls = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('TweetDetail') || url.includes('graphql')) {
      try {
        const text = await response.text();

        // mp4 URL 추출 (다양한 패턴)
        const patterns = [
          /https:\/\/video\.twimg\.com\/[^"\\]+\.mp4[^"\\]*/g,
          /https:\/\/video\.twimg\.com\/amplify_video\/[^"\\]+/g,
          /https:\/\/video\.twimg\.com\/ext_tw_video\/[^"\\]+/g,
        ];

        for (const pattern of patterns) {
          const matches = text.matchAll(pattern);
          for (const match of matches) {
            let videoUrl = match[0].replace(/\\/g, '');
            if (!videoUrls.includes(videoUrl)) {
              videoUrls.push(videoUrl);
            }
          }
        }
      } catch (e) {}
    }
  });

  console.log('페이지 로딩 중...');
  await page.goto('https://x.com/antigravity/status/2011881775375794380', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // API 응답 기다리기
  await page.waitForTimeout(8000);

  console.log('\n=== 발견된 비디오 URL ===');
  if (videoUrls.length > 0) {
    videoUrls.forEach((url, i) => {
      console.log(`${i+1}. ${url}`);
    });
  } else {
    console.log('비디오 URL을 찾지 못함');
  }

  await browser.close();
}

test();
