import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Admin 페이지
await page.goto('http://localhost:3000/ko/admin/content');
await page.waitForTimeout(3000);

// vibecode 찾기
const rows = await page.locator('text=Full-Stack').all();
console.log('Found "Full-Stack" in admin:', rows.length);

// 테이블에서 vibecode 행 찾기
const tableText = await page.locator('table, [class*="list"]').first().innerText();
console.log('\nTable contains "vibecode":', tableText.includes('vibecode'));
console.log('Table contains "Full-Stack":', tableText.includes('Full-Stack'));

await page.screenshot({ path: 'public/screenshots/admin-check.png', fullPage: true });
await page.waitForTimeout(3000);
await browser.close();
