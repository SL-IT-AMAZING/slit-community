import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// 홈페이지로 이동 (소셜 카드가 표시되는 곳)
console.log('Navigating to home page...');
await page.goto('http://localhost:3000/ko');
await page.waitForTimeout(2000);

// vibecode 포스트 찾기 (Full-Stack Vibe Coding)
const vibeText = await page.locator('text=Full-Stack').first();
const found = await vibeText.count();
console.log('Found "Full-Stack" on home page:', found > 0);

if (found > 0) {
  console.log('Taking screenshot of home page...');
  await page.screenshot({ path: 'public/screenshots/home_video_test.png', fullPage: false });
}

// 콘텐츠 페이지로 이동
console.log('Navigating to content page...');
await page.goto('http://localhost:3000/ko/content');
await page.waitForTimeout(2000);

// vibecode 포스트 찾기
const vibeTextContent = await page.locator('text=Full-Stack Vibe Coding').first();
const foundContent = await vibeTextContent.count();
console.log('Found "Full-Stack Vibe Coding" on content page:', foundContent > 0);

// X 타입 필터 적용
console.log('Looking for X (Twitter) filter...');
const xFilter = await page.locator('button:has-text("트위터"), button:has-text("Twitter"), [data-value="x"]').first();
const hasXFilter = await xFilter.count() > 0;
console.log('X filter found:', hasXFilter);

if (hasXFilter) {
  await xFilter.click();
  await page.waitForTimeout(2000);
}

// 비디오 요소 확인
console.log('Checking for video elements...');
const videoElements = await page.locator('video').all();
console.log('Video elements found:', videoElements.length);

for (let i = 0; i < videoElements.length; i++) {
  const src = await videoElements[i].getAttribute('src');
  console.log(`Video ${i + 1} src:`, src);
}

// 스크린샷 저장
await page.screenshot({ path: 'public/screenshots/content_video_test.png', fullPage: false });
console.log('Screenshot saved to public/screenshots/content_video_test.png');

await page.waitForTimeout(3000);
await browser.close();
console.log('Test completed.');
