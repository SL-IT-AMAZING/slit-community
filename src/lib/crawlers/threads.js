import {
  crawlWithScreenshot,
  loadCookies,
  loadCookiesFromEnv,
  fetchPostDetails,
} from "./screenshot-crawler.js";
import { upsertCrawledContent, logCrawl, getScreenshotDir } from "./index.js";

const FEED_URL = "https://www.threads.com/";

/**
 * Threads 크롤러
 * 스크린샷 + 미디어 다운로드 방식
 * 본문/메트릭 분석은 나중에 Claude로 수행
 * @param {Object} options
 * @param {number} options.limit - 최대 수집 개수 (기본: 20)
 */
export async function crawlThreads({ limit = 20 } = {}) {
  logCrawl("threads", "Starting crawl");

  // 쿠키 로드 (파일 또는 환경변수)
  const cookies = loadCookies("threads") || loadCookiesFromEnv("threads");

  if (!cookies) {
    logCrawl("threads", "No cookies found. Please run save-session.js first.");
    return { success: false, error: "No cookies found" };
  }

  // 스크린샷 저장 폴더 생성 (플랫폼/타임스탬프 구조)
  const screenshotInfo = getScreenshotDir("threads");
  logCrawl("threads", `Screenshots will be saved to: ${screenshotInfo.dir}`);

  try {
    const { screenshot: feedScreenshot, links } = await crawlWithScreenshot(
      "threads",
      FEED_URL,
      cookies,
      screenshotInfo,
    );

    logCrawl(
      "threads",
      `Feed screenshot captured, found ${links.length} links`,
    );

    // Threads 포스트 링크 필터링 (threads.net 또는 threads.com)
    const postLinks = links.filter(
      (link) =>
        (link.href.includes("threads.net/@") ||
          link.href.includes("threads.com/@")) &&
        link.href.includes("/post/"),
    );

    // 고유한 포스트 ID 추출
    const uniquePosts = new Map();
    postLinks.forEach((link) => {
      const match = link.href.match(/\/post\/([A-Za-z0-9_-]+)/);
      if (match) {
        const postId = match[1];
        if (!uniquePosts.has(postId)) {
          uniquePosts.set(postId, link);
        }
      }
    });

    logCrawl("threads", `Found ${uniquePosts.size} unique posts`);

    if (uniquePosts.size === 0) {
      logCrawl("threads", "No posts found");
      return { success: true, count: 0, items: [] };
    }

    // 각 포스트 스크린샷 + 미디어 다운로드
    const postEntries = Array.from(uniquePosts.entries()).slice(0, limit);
    const items = [];

    logCrawl("threads", `Processing ${postEntries.length} posts...`);

    for (const [postId, link] of postEntries) {
      // URL에서 사용자명 추출
      const userMatch = link.href.match(/threads\.(?:net|com)\/@([^/]+)/);
      const username = userMatch ? userMatch[1] : null;

      // 스크린샷 + 미디어 다운로드
      let postDetails = { screenshotUrl: null, downloadedMedia: [] };
      try {
        postDetails = await fetchPostDetails(
          "threads",
          link.href,
          cookies,
          screenshotInfo,
        );
        logCrawl(
          "threads",
          `Captured: ${postId} (${postDetails.downloadedMedia?.length || 0} media)`,
        );
      } catch (err) {
        logCrawl("threads", `Failed for ${postId}: ${err.message}`);
      }

      items.push({
        platform: "threads",
        platform_id: postId,
        url: link.href,
        author_name: username ? `@${username}` : null,
        author_url: username ? `https://www.threads.net/@${username}` : null,
        screenshot_url: null,
        status: "pending_analysis",
        raw_data: {
          downloadedMedia: postDetails.downloadedMedia || [],
          mediaUrls: postDetails.mediaUrls || [],
          externalLinks: postDetails.externalLinks || [],
          threadsVideoUrl: postDetails.threadsVideoUrl || null,
          downloadedVideoUrl: postDetails.downloadedVideoUrl || null,
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

    logCrawl("threads", `Saved ${savedData?.length || items.length} posts`);
    return { success: true, count: savedData?.length || items.length, items };
  } catch (error) {
    logCrawl("threads", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
