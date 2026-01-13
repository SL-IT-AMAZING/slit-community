#!/usr/bin/env node

/**
 * 메트릭 수집 스케줄러
 *
 * 최근 7일 내 콘텐츠의 현재 메트릭을 수집하여 metrics_history 테이블에 저장
 * 하루 3번 실행 권장: 08:00, 14:00, 20:00
 *
 * 사용법:
 *   node scripts/metrics-collector.js
 *
 * cron 설정 예시:
 *   0 8,14,20 * * * cd /path/to/kiev && node scripts/metrics-collector.js
 */

import { createClient } from "@supabase/supabase-js";
import { fetchPostDetails } from "../src/lib/crawlers/screenshot-crawler.js";

// 환경 변수 로드 (dotenv 필요 시)
// import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DAYS_TO_COLLECT = 7;
const PLATFORMS_WITH_METRICS = ["x", "threads", "reddit", "youtube"];

/**
 * 로그 출력
 */
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Reddit 포스트 현재 메트릭 조회
 */
async function fetchRedditMetrics(platformId) {
  try {
    const response = await fetch(
      `https://www.reddit.com/comments/${platformId}.json`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const post = data[0]?.data?.children?.[0]?.data;

    if (!post) return null;

    return {
      score: post.score,
      upvote_ratio: post.upvote_ratio,
      num_comments: post.num_comments,
    };
  } catch (error) {
    log(`Reddit metrics fetch error for ${platformId}: ${error.message}`);
    return null;
  }
}

/**
 * YouTube 비디오 현재 메트릭 조회 (oEmbed API - 제한적)
 */
async function fetchYouTubeMetrics(platformId) {
  // YouTube Data API 키가 필요하므로, 여기서는 기본값 반환
  // 실제 구현시 YouTube Data API v3 사용 권장
  return null;
}

/**
 * 콘텐츠별 메트릭 수집
 */
async function collectMetricsForContent(content) {
  const { id, platform, platform_id, url, raw_data } = content;
  let metrics = null;

  try {
    switch (platform) {
      case "x":
      case "threads":
        // Playwright 필요 - 쿠키 없이는 제한적
        // 현재 raw_data에 저장된 메트릭 사용 (새로 수집 시 screenshot-crawler 사용)
        metrics = raw_data?.metrics || {
          likes: raw_data?.likes || 0,
          retweets: raw_data?.retweets || 0,
          replies: raw_data?.replies || 0,
        };
        break;

      case "reddit":
        const redditMetrics = await fetchRedditMetrics(platform_id);
        if (redditMetrics) {
          metrics = {
            score: redditMetrics.score,
            upvote_ratio: redditMetrics.upvote_ratio,
            comments: redditMetrics.num_comments,
          };
        }
        break;

      case "youtube":
        // YouTube API 키 필요
        metrics = raw_data?.metrics || null;
        break;

      default:
        metrics = raw_data?.metrics || null;
    }

    return metrics;
  } catch (error) {
    log(`Error collecting metrics for ${platform}/${platform_id}: ${error.message}`);
    return null;
  }
}

/**
 * 메트릭 히스토리 저장
 */
async function saveMetricsHistory(contentId, metrics) {
  const { error } = await supabase.from("metrics_history").insert({
    content_id: contentId,
    recorded_at: new Date().toISOString(),
    metrics: metrics,
  });

  if (error) {
    log(`Error saving metrics history: ${error.message}`);
    return false;
  }

  return true;
}

/**
 * 메인 수집 함수
 */
async function collectAllMetrics() {
  log("Starting metrics collection...");

  // 최근 7일 내 콘텐츠 조회
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DAYS_TO_COLLECT);

  const { data: recentContent, error } = await supabase
    .from("crawled_content")
    .select("id, platform, platform_id, url, raw_data")
    .in("platform", PLATFORMS_WITH_METRICS)
    .gte("crawled_at", sevenDaysAgo.toISOString())
    .order("crawled_at", { ascending: false });

  if (error) {
    log(`Error fetching content: ${error.message}`);
    return;
  }

  log(`Found ${recentContent.length} content items to collect metrics for`);

  let successCount = 0;
  let errorCount = 0;

  for (const content of recentContent) {
    const metrics = await collectMetricsForContent(content);

    if (metrics) {
      const saved = await saveMetricsHistory(content.id, metrics);
      if (saved) {
        successCount++;
        log(`Collected metrics for ${content.platform}/${content.platform_id}`);
      } else {
        errorCount++;
      }
    } else {
      log(`No metrics available for ${content.platform}/${content.platform_id}`);
    }

    // Rate limiting: 500ms 대기
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  log(`Metrics collection complete. Success: ${successCount}, Errors: ${errorCount}`);
}

// 스크립트 실행
collectAllMetrics()
  .then(() => {
    log("Script finished");
    process.exit(0);
  })
  .catch((error) => {
    log(`Script error: ${error.message}`);
    process.exit(1);
  });
