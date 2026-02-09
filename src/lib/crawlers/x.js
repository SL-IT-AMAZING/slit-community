import {
  crawlWithScreenshot,
  loadCookies,
  loadCookiesFromEnv,
  fetchPostDetails,
} from "./screenshot-crawler.js";
import { upsertCrawledContent, logCrawl, getScreenshotDir } from "./index.js";

const FEED_URL = "https://x.com/home"; // Following 탭

/**
 * X (Twitter) 크롤러
 * 스크린샷 + 미디어 다운로드 방식
 * 본문/메트릭 분석은 나중에 Claude로 수행
 * @param {Object} options
 * @param {number} options.limit - 최대 수집 개수 (기본: 20)
 */
export async function crawlX({ limit = 20 } = {}) {
  logCrawl("x", "Starting crawl");

  // 쿠키 로드 (파일 또는 환경변수)
  const cookies = loadCookies("x") || loadCookiesFromEnv("x");

  if (!cookies) {
    logCrawl("x", "No cookies found. Please run save-session.js first.");
    return { success: false, error: "No cookies found" };
  }

  // 스크린샷 저장 폴더 생성 (플랫폼/타임스탬프 구조)
  const screenshotInfo = getScreenshotDir("x");
  logCrawl("x", `Screenshots will be saved to: ${screenshotInfo.dir}`);

  try {
    const { screenshot: feedScreenshot, links } = await crawlWithScreenshot(
      "x",
      FEED_URL,
      cookies,
      screenshotInfo,
    );

    logCrawl("x", `Feed screenshot captured, found ${links.length} links`);

    // 트윗 링크 필터링
    const tweetLinks = links.filter(
      (link) =>
        link.href.includes("/status/") &&
        !link.href.includes("/photo/") &&
        !link.href.includes("/video/"),
    );

    // 고유한 트윗 ID 추출
    const uniqueTweets = new Map();
    tweetLinks.forEach((link) => {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) {
        const tweetId = match[1];
        if (!uniqueTweets.has(tweetId)) {
          uniqueTweets.set(tweetId, link);
        }
      }
    });

    logCrawl("x", `Found ${uniqueTweets.size} unique tweets`);

    if (uniqueTweets.size === 0) {
      logCrawl("x", "No tweets found");
      return { success: true, count: 0, items: [] };
    }

    // 각 트윗 스크린샷 + 미디어 다운로드
    const tweetEntries = Array.from(uniqueTweets.entries()).slice(0, limit);
    const items = [];

    logCrawl("x", `Processing ${tweetEntries.length} tweets...`);

    for (const [tweetId, link] of tweetEntries) {
      // URL에서 사용자명 추출
      const userMatch = link.href.match(
        /(?:x\.com|twitter\.com)\/([^/]+)\/status/,
      );
      const username = userMatch ? userMatch[1] : null;

      // 스크린샷 + 미디어 다운로드
      let postDetails = { screenshotUrl: null, downloadedMedia: [] };
      try {
        postDetails = await fetchPostDetails(
          "x",
          link.href,
          cookies,
          screenshotInfo,
        );
        logCrawl(
          "x",
          `Captured: ${tweetId} (${postDetails.downloadedMedia?.length || 0} media)`,
        );
      } catch (err) {
        logCrawl("x", `Failed for ${tweetId}: ${err.message}`);
      }

      items.push({
        platform: "x",
        platform_id: tweetId,
        url: link.href,
        author_name: username ? `@${username}` : null,
        author_url: username ? `https://x.com/${username}` : null,
        screenshot_url: null, // 스크린샷 미사용 - R2 저장 안함
        status: "pending_analysis",
        raw_data: {
          // feedScreenshot, screenshotUrls 제거 - R2에 불필요한 스크린샷 저장 방지
          downloadedMedia: postDetails.downloadedMedia || [],
          mediaUrls: postDetails.mediaUrls || [],
          externalLinks: postDetails.externalLinks || [],
          // YouTube 관련 필드
          youtubeUrl: postDetails.youtubeUrl || null,
          youtubeVideoId: postDetails.youtubeVideoId || null,
          youtubeEmbedUrl: postDetails.youtubeEmbedUrl || null,
          // Twitter 네이티브 비디오
          twitterVideoUrl: postDetails.twitterVideoUrl || null,
          downloadedVideoUrl: postDetails.downloadedVideoUrl || null, // 로컬 다운로드된 비디오
          hasVideo: postDetails.hasVideo || false,
        },
      });

      // 요청 간격
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    }

    // DB에 저장
    const { data: savedData, error } = await upsertCrawledContent(items);

    if (error) {
      throw error;
    }

    logCrawl("x", `Saved ${savedData?.length || items.length} tweets`);
    return { success: true, count: savedData?.length || items.length, items };
  } catch (error) {
    logCrawl("x", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
