/**
 * 크롤러 테스트 스크립트
 * GitHub와 Trendshift 크롤러를 각 6개씩 테스트합니다.
 */

import { crawlGithubTrending } from '../src/lib/crawlers/github.js';
import { crawlTrendshift } from '../src/lib/crawlers/trendshift.js';
import { logCrawl } from '../src/lib/crawlers/index.js';

async function testCrawlers() {
  logCrawl('test', '=== Starting crawler test ===');

  // GitHub 테스트 (daily 6개)
  logCrawl('test', 'Testing GitHub crawler (daily, limit: 6)...');
  try {
    const githubResult = await crawlGithubTrending({ since: 'daily', limit: 6 });
    logCrawl('test', 'GitHub result: ' + JSON.stringify(githubResult));
  } catch (error) {
    logCrawl('test', 'GitHub error: ' + error.message);
  }

  // Trendshift 테스트 (6개)
  logCrawl('test', 'Testing Trendshift crawler (limit: 6)...');
  try {
    const trendshiftResult = await crawlTrendshift({ limit: 6 });
    logCrawl('test', 'Trendshift result: ' + JSON.stringify(trendshiftResult));
  } catch (error) {
    logCrawl('test', 'Trendshift error: ' + error.message);
  }

  logCrawl('test', '=== Crawler test complete ===');
}

testCrawlers().catch(console.error);
