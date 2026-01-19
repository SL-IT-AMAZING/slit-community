import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('Navigating to home page...');
await page.goto('http://localhost:3000/ko');
await page.waitForTimeout(3000);

// X(트위터) 섹션 찾기
console.log('Looking for vibecode card...');
const vibeCard = await page.locator('text=vibecode.dev').first();
await vibeCard.scrollIntoViewIfNeeded();
await page.waitForTimeout(1000);

// 비디오 컨테이너 찾기 (비디오 또는 오버레이)
console.log('Looking for video container...');
const videoContainer = await page.locator('video').first().locator('..');
await videoContainer.click({ force: true });
await page.waitForTimeout(3000);

console.log('Taking screenshot after click...');
await page.screenshot({ path: 'public/screenshots/video_after_click.png', fullPage: false });

// 비디오 상태 확인
const videoInfo = await page.evaluate(() => {
  const vid = document.querySelector('video');
  if (!vid) return null;
  return {
    src: vid.src,
    currentTime: vid.currentTime,
    duration: vid.duration,
    paused: vid.paused,
    readyState: vid.readyState,
    error: vid.error ? vid.error.message : null
  };
});
console.log('Video info:', videoInfo);

// 모달이 열렸는지 확인
const modal = await page.locator('[class*="fixed"][class*="z-"]').first();
const hasModal = await modal.count() > 0;
console.log('Modal opened:', hasModal);

if (hasModal) {
  // 모달 내 비디오 확인
  const modalVideo = await page.locator('[class*="fixed"] video').first();
  const hasModalVideo = await modalVideo.count() > 0;
  console.log('Modal has video:', hasModalVideo);

  if (hasModalVideo) {
    const modalVideoInfo = await page.evaluate(() => {
      const vids = document.querySelectorAll('video');
      // 마지막 비디오 (모달 내 비디오)
      const vid = vids[vids.length - 1];
      if (!vid) return null;
      return {
        src: vid.src,
        currentTime: vid.currentTime,
        duration: vid.duration,
        paused: vid.paused,
        readyState: vid.readyState,
        error: vid.error ? vid.error.message : null
      };
    });
    console.log('Modal video info:', modalVideoInfo);
  }
}

await page.waitForTimeout(3000);
await browser.close();
console.log('Test completed.');
