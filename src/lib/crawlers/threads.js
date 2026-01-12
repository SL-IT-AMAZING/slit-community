import { crawlWithScreenshot, loadCookies, loadCookiesFromEnv, fetchPostDetails } from "./screenshot-crawler.js";
import { upsertCrawledContent, logCrawl } from "./index.js";

const FEED_URL = "https://www.threads.com/";

/**
 * Threads 크롤러
 * Playwright 스크린샷 방식
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

  try {
    const { screenshot, links, posts } = await crawlWithScreenshot("threads", FEED_URL, cookies);

    logCrawl("threads", `Captured screenshot, found ${links.length} links, ${posts.length} posts`);

    // Threads 포스트 링크 필터링 (threads.net 또는 threads.com)
    const postLinks = links.filter(
      (link) =>
        (link.href.includes("threads.net/@") || link.href.includes("threads.com/@")) &&
        link.href.includes("/post/")
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
      return { success: true, count: 0 };
    }

    // 데이터 변환 + 상세 정보 추출
    const postEntries = Array.from(uniquePosts.entries()).slice(0, limit);
    const items = [];

    logCrawl("threads", `Fetching details for ${postEntries.length} posts...`);

    for (const [postId, link] of postEntries) {
      // URL에서 사용자명 추출 (threads.net 또는 threads.com)
      const userMatch = link.href.match(/threads\.(?:net|com)\/@([^/]+)/);
      const username = userMatch ? userMatch[1] : null;

      // 각 포스트 상세 정보 가져오기
      let postDetails = { content: "", metrics: {} };
      try {
        postDetails = await fetchPostDetails("threads", link.href, cookies);
        logCrawl("threads", `Fetched details for ${postId}: ${postDetails.content.slice(0, 50)}...`);
      } catch (err) {
        logCrawl("threads", `Failed to fetch details for ${postId}: ${err.message}`);
      }

      items.push({
        platform: "threads",
        platform_id: postId,
        title: postDetails.content?.slice(0, 200) || link.text?.slice(0, 200) || `Thread ${postId}`,
        description: postDetails.content?.slice(0, 500) || link.text?.slice(0, 500) || null,
        content_text: postDetails.content || link.text || null,
        url: link.href,
        author_name: username ? `@${username}` : null,
        author_url: username ? `https://www.threads.net/@${username}` : null,
        screenshot_url: screenshot,
        status: "pending",
        raw_data: {
          linkText: link.text,
          content: postDetails.content,
          likes: postDetails.metrics?.likes || 0,
          replies: postDetails.metrics?.replies || 0,
          reposts: postDetails.metrics?.reposts || 0,
        },
      });

      // 너무 빠른 요청 방지
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
    }

    // DB에 저장
    const { data: savedData, error } = await upsertCrawledContent(items);

    if (error) {
      throw error;
    }

    logCrawl("threads", `Successfully saved ${savedData?.length || items.length} posts`);
    return { success: true, count: savedData?.length || items.length };
  } catch (error) {
    logCrawl("threads", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
