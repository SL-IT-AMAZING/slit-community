import { chromium } from 'playwright';

async function testResponsive() {
  const browser = await chromium.launch();
  const viewports = [
    { name: '320px-iPhoneSE', width: 320, height: 568 },
    { name: '375px-iPhone12', width: 375, height: 667 },
    { name: '768px-tablet', width: 768, height: 1024 },
  ];

  const results = [];
  
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: 'dark'
    });
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:3000/ko', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);
      
      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      // Get page width info
      const widthInfo = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      
      // Take screenshot
      const screenshotPath = `./public/screenshots/responsive-${vp.name}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      results.push({
        viewport: vp.name,
        hasHorizontalScroll,
        ...widthInfo,
        overflow: widthInfo.scrollWidth - widthInfo.clientWidth,
        status: hasHorizontalScroll ? 'FAIL' : 'PASS'
      });
      
    } catch (e) {
      results.push({
        viewport: vp.name,
        error: e.message.substring(0, 50),
        status: 'ERROR'
      });
    }
    
    await context.close();
  }
  
  await browser.close();
  
  console.log('\n=== Responsive Test Results ===\n');
  console.table(results);
  
  const failed = results.filter(r => r.status === 'FAIL');
  if (failed.length > 0) {
    console.log('\n❌ FAILED viewports:', failed.map(f => f.viewport).join(', '));
  } else if (results.every(r => r.status === 'PASS')) {
    console.log('\n✅ All viewports passed!');
  }
}

testResponsive().catch(console.error);
