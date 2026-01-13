import { crawlWithScreenshot, loadCookies, loadCookiesFromEnv, fetchPostDetails } from "./screenshot-crawler.js";
import { upsertCrawledContent, logCrawl } from "./index.js";
import { translateContent } from "./translate.js";

const FEED_URL = "https://x.com/home"; // Following 탭

/**
 * X (Twitter) 크롤러
 * Playwright 스크린샷 방식
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

  try {
    const { screenshot, links, posts } = await crawlWithScreenshot("x", FEED_URL, cookies);

    logCrawl("x", `Captured screenshot, found ${links.length} links, ${posts.length} posts`);

    // 트윗 링크 필터링
    const tweetLinks = links.filter(
      (link) =>
        link.href.includes("/status/") &&
        !link.href.includes("/photo/") &&
        !link.href.includes("/video/")
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
      return { success: true, count: 0 };
    }

    // 데이터 변환 + 상세 정보 추출
    const tweetEntries = Array.from(uniqueTweets.entries()).slice(0, limit);
    const items = [];

    logCrawl("x", `Fetching details for ${tweetEntries.length} tweets...`);

    for (const [tweetId, link] of tweetEntries) {
      // URL에서 사용자명 추출 (x.com 또는 twitter.com)
      const userMatch = link.href.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status/);
      const username = userMatch ? userMatch[1] : null;

      // 각 트윗 상세 정보 가져오기
      let postDetails = { content: "", metrics: {} };
      try {
        postDetails = await fetchPostDetails("x", link.href, cookies);
        logCrawl("x", `Fetched details for ${tweetId}: ${postDetails.content.slice(0, 50)}...`);
      } catch (err) {
        logCrawl("x", `Failed to fetch details for ${tweetId}: ${err.message}`);
      }

      // 본문 번역
      const translatedContent = await translateContent(postDetails.content || link.text);

      items.push({
        platform: "x",
        platform_id: tweetId,
        title: postDetails.content?.slice(0, 200) || link.text?.slice(0, 200) || `Tweet ${tweetId}`,
        description: postDetails.content?.slice(0, 500) || link.text?.slice(0, 500) || null,
        content_text: postDetails.content || link.text || null,
        translated_content: translatedContent,
        url: link.href,
        author_name: username ? `@${username}` : null,
        author_url: username ? `https://x.com/${username}` : null,
        screenshot_url: screenshot,
        status: "pending",
        raw_data: {
          linkText: link.text,
          content: postDetails.content,
          likes: postDetails.metrics?.likes || 0,
          retweets: postDetails.metrics?.retweets || 0,
          replies: postDetails.metrics?.replies || 0,
          views: postDetails.metrics?.views || 0,
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

    logCrawl("x", `Successfully saved ${savedData?.length || items.length} tweets`);
    return { success: true, count: savedData?.length || items.length };
  } catch (error) {
    logCrawl("x", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
