import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('Navigating to home page...');
await page.goto('http://localhost:3000/ko');
await page.waitForTimeout(3000);

// X(트위터) 섹션 찾기
console.log('Looking for X (Twitter) section...');
const xSection = await page.locator('text=트위터').first();
const hasXSection = await xSection.count() > 0;
console.log('X section found:', hasXSection);

if (hasXSection) {
  // X 섹션으로 스크롤
  await xSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // 스크린샷
  await page.screenshot({ path: 'public/screenshots/x_section_test.png', fullPage: false });

  // X 섹션 내의 카드들 확인
  const xCards = await page.locator('[class*="flex gap-4"] > div').all();
  console.log('Cards in X section:', xCards.length);

  // vibecode 관련 카드 찾기
  const vibeCard = await page.locator('text=Full-Stack').first();
  const hasVibeCard = await vibeCard.count() > 0;
  console.log('Vibe Coding card found:', hasVibeCard);

  if (hasVibeCard) {
    await vibeCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // 비디오 요소 확인
    const videoElement = await page.locator('video').first();
    const hasVideo = await videoElement.count() > 0;
    console.log('Video element found:', hasVideo);

    if (hasVideo) {
      const src = await videoElement.getAttribute('src');
      console.log('Video src:', src);
    }

    await page.screenshot({ path: 'public/screenshots/vibe_card_test.png', fullPage: false });
  }
}

// 페이지 전체 HTML에서 비디오 URL 확인
const pageContent = await page.content();
const hasVideoUrl = pageContent.includes('video_2011962194993561934');
console.log('Page contains video URL:', hasVideoUrl);

const hasTwitterVideo = pageContent.includes('twitterVideoUrl');
console.log('Page contains twitterVideoUrl reference:', hasTwitterVideo);

await page.waitForTimeout(2000);
await browser.close();
console.log('Test completed.');
