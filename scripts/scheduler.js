/**
 * 로컬 크롤링 스케줄러
 *
 * 플랫폼별 크롤링 주기:
 * - YouTube, Reddit, X, Threads: 1.5~2.5시간
 * - GitHub, Trendshift: 24시간
 *
 * 사용법:
 * node scripts/scheduler.js              # 포그라운드 실행
 * nohup node scripts/scheduler.js &      # 백그라운드 실행
 * pm2 start scripts/scheduler.js         # PM2로 관리
 *
 * 환경 변수:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - YOUTUBE_CLIENT_ID
 * - YOUTUBE_CLIENT_SECRET
 * - YOUTUBE_REFRESH_TOKEN
 */

import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

import { crawlYouTube } from "../src/lib/crawlers/youtube.js";
import { crawlReddit } from "../src/lib/crawlers/reddit.js";
import { crawlX } from "../src/lib/crawlers/x.js";
import { crawlThreads } from "../src/lib/crawlers/threads.js";
import { crawlGithubTrendingAll } from "../src/lib/crawlers/github.js";
import { crawlTrendshiftAll } from "../src/lib/crawlers/trendshift.js";
import { logCrawl } from "../src/lib/crawlers/index.js";

// 최소/최대 대기 시간 (분)
const MIN_INTERVAL_MINUTES = 90;
const MAX_INTERVAL_MINUTES = 150;

// 24시간 (밀리초)
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

// 마지막 실행 시간 추적
const lastRunTime = {
  github: 0,
  trendshift: 0,
};

/**
 * 랜덤 대기 시간 계산 (밀리초)
 */
function getRandomInterval() {
  const minutes = MIN_INTERVAL_MINUTES + Math.random() * (MAX_INTERVAL_MINUTES - MIN_INTERVAL_MINUTES);
  return Math.round(minutes * 60 * 1000);
}

/**
 * 다음 실행까지 대기
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 24시간 경과 여부 확인
 */
function shouldRunDaily(platform) {
  const now = Date.now();
  const lastRun = lastRunTime[platform] || 0;
  return now - lastRun >= DAILY_INTERVAL_MS;
}

/**
 * 모든 크롤러 실행
 */
async function runAllCrawlers() {
  const startTime = new Date();
  logCrawl("scheduler", "=== Starting crawl cycle ===");

  const results = {
    youtube: null,
    reddit: null,
    x: null,
    threads: null,
    github: null,
    trendshift: null,
  };

  // YouTube 크롤러 (12시간 이내, 쇼츠 제외)
  try {
    logCrawl("scheduler", "Running YouTube crawler...");
    results.youtube = await crawlYouTube();
    logCrawl("scheduler", `YouTube: ${results.youtube.success ? `${results.youtube.count} items` : results.youtube.error}`);
  } catch (error) {
    logCrawl("scheduler", `YouTube error: ${error.message}`);
    results.youtube = { success: false, error: error.message };
  }

  // 크롤러 간 딜레이 (30초~1분)
  await sleep(30000 + Math.random() * 30000);

  // Reddit 크롤러 (20개)
  try {
    logCrawl("scheduler", "Running Reddit crawler...");
    results.reddit = await crawlReddit({ limit: 20 });
    logCrawl("scheduler", `Reddit: ${results.reddit.success ? `${results.reddit.count} items` : results.reddit.error}`);
  } catch (error) {
    logCrawl("scheduler", `Reddit error: ${error.message}`);
    results.reddit = { success: false, error: error.message };
  }

  // 크롤러 간 딜레이
  await sleep(30000 + Math.random() * 30000);

  // X 크롤러 (20개, 쿠키 필요)
  try {
    logCrawl("scheduler", "Running X crawler...");
    results.x = await crawlX({ limit: 20 });
    logCrawl("scheduler", `X: ${results.x.success ? `${results.x.count} items` : results.x.error}`);
  } catch (error) {
    logCrawl("scheduler", `X error: ${error.message}`);
    results.x = { success: false, error: error.message };
  }

  // 크롤러 간 딜레이
  await sleep(30000 + Math.random() * 30000);

  // Threads 크롤러 (20개, 쿠키 필요)
  try {
    logCrawl("scheduler", "Running Threads crawler...");
    results.threads = await crawlThreads({ limit: 20 });
    logCrawl("scheduler", `Threads: ${results.threads.success ? `${results.threads.count} items` : results.threads.error}`);
  } catch (error) {
    logCrawl("scheduler", `Threads error: ${error.message}`);
    results.threads = { success: false, error: error.message };
  }

  // GitHub 크롤러 (24시간마다, daily/weekly/monthly 각 20개)
  if (shouldRunDaily("github")) {
    await sleep(30000 + Math.random() * 30000);

    try {
      logCrawl("scheduler", "Running GitHub crawler (daily interval)...");
      results.github = await crawlGithubTrendingAll({ limit: 20 });
      logCrawl("scheduler", `GitHub: ${results.github.success ? `${results.github.count} items` : results.github.error}`);
      lastRunTime.github = Date.now();
    } catch (error) {
      logCrawl("scheduler", `GitHub error: ${error.message}`);
      results.github = { success: false, error: error.message };
    }
  } else {
    const hoursUntilNext = Math.round((DAILY_INTERVAL_MS - (Date.now() - lastRunTime.github)) / 3600000);
    logCrawl("scheduler", `GitHub: Skipping (next run in ~${hoursUntilNext}h)`);
  }

  // Trendshift 크롤러 (24시간마다, 모든 기간 20개씩)
  if (shouldRunDaily("trendshift")) {
    await sleep(30000 + Math.random() * 30000);

    try {
      logCrawl("scheduler", "Running Trendshift crawler (daily interval)...");
      results.trendshift = await crawlTrendshiftAll({ limit: 20 });
      logCrawl("scheduler", `Trendshift: ${results.trendshift.success ? `${results.trendshift.count} items` : results.trendshift.error}`);
      lastRunTime.trendshift = Date.now();
    } catch (error) {
      logCrawl("scheduler", `Trendshift error: ${error.message}`);
      results.trendshift = { success: false, error: error.message };
    }
  } else {
    const hoursUntilNext = Math.round((DAILY_INTERVAL_MS - (Date.now() - lastRunTime.trendshift)) / 3600000);
    logCrawl("scheduler", `Trendshift: Skipping (next run in ~${hoursUntilNext}h)`);
  }

  // 요약
  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 1000);
  const successCount = Object.values(results).filter((r) => r?.success).length;
  const totalPlatforms = Object.values(results).filter((r) => r !== null).length;

  logCrawl("scheduler", `=== Crawl cycle complete ===`);
  logCrawl("scheduler", `Duration: ${duration}s, Success: ${successCount}/${totalPlatforms}`);

  return results;
}

/**
 * 메인 루프
 */
async function main() {
  logCrawl("scheduler", "Scheduler started");
  logCrawl("scheduler", `Regular interval: ${MIN_INTERVAL_MINUTES}-${MAX_INTERVAL_MINUTES} minutes`);
  logCrawl("scheduler", `Daily crawlers: GitHub, Trendshift`);

  // 무한 루프
  while (true) {
    try {
      // 크롤러 실행
      await runAllCrawlers();
    } catch (error) {
      logCrawl("scheduler", `Unexpected error: ${error.message}`);
    }

    // 다음 실행까지 대기
    const nextInterval = getRandomInterval();
    const nextRun = new Date(Date.now() + nextInterval);
    logCrawl("scheduler", `Next crawl at ${nextRun.toISOString()} (in ${Math.round(nextInterval / 60000)} min)`);

    await sleep(nextInterval);
  }
}

// 실행
main().catch((error) => {
  console.error("Scheduler fatal error:", error);
  process.exit(1);
});
