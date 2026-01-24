import {
  upsertCrawledContent,
  getExistingPlatformIds,
  logCrawl,
  getScreenshotDir,
} from "./index.js";
import { chromium } from "playwright";
import * as path from "path";

const SUBREDDIT = "vibecoding";
const FETCH_LIMIT = 20;

// 프로필 사진 캐시 (세션 동안 유지)
const avatarCache = new Map();

/**
 * Reddit 사용자 프로필 사진 조회
 * @param {string} username - Reddit 사용자명
 * @returns {Promise<string|null>} 프로필 사진 URL 또는 null
 */
async function fetchUserAvatar(username) {
  // 캐시 확인
  if (avatarCache.has(username)) {
    return avatarCache.get(username);
  }

  // [deleted] 같은 특수 사용자 처리
  if (!username || username === "[deleted]" || username === "AutoModerator") {
    return null;
  }

  try {
    const response = await fetch(
      `https://www.reddit.com/user/${username}/about.json`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      avatarCache.set(username, null);
      return null;
    }

    const data = await response.json();
    const avatarUrl = data.data?.icon_img || data.data?.snoovatar_img || null;

    // URL에서 쿼리 파라미터 정리 (크기 조정 파라미터 제거)
    const cleanedUrl = avatarUrl?.split("?")?.[0] || avatarUrl;

    avatarCache.set(username, cleanedUrl);
    return cleanedUrl;
  } catch {
    avatarCache.set(username, null);
    return null;
  }
}

/**
 * Reddit r/vibecoding 크롤러
 * JSON endpoint 사용 (인증 불필요)
 * @param {Object} options
 * @param {number} options.limit - 최대 수집 개수 (기본: 20)
 * @param {boolean} options.fetchAvatars - 프로필 사진 조회 여부 (기본: true)
 */
export async function crawlReddit({
  limit = FETCH_LIMIT,
  fetchAvatars = true,
} = {}) {
  logCrawl("reddit", `Starting crawl for r/${SUBREDDIT}`);

  try {
    const response = await fetch(
      `https://old.reddit.com/r/${SUBREDDIT}/new.json?limit=${limit}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.data.children;

    logCrawl("reddit", `Fetched ${posts.length} posts`);

    // 기존 ID 체크
    const platformIds = posts.map((p) => p.data.id);
    const existingIds = await getExistingPlatformIds("reddit", platformIds);
    const newPosts = posts.filter((p) => !existingIds.has(p.data.id));

    logCrawl(
      "reddit",
      `New posts: ${newPosts.length}, Duplicates: ${existingIds.size}`,
    );

    if (newPosts.length === 0) {
      logCrawl("reddit", "No new posts to save");
      return { success: true, count: 0 };
    }

    // 프로필 사진 일괄 조회 (rate limiting을 위해 순차 처리)
    const authorAvatars = {};
    if (fetchAvatars) {
      const uniqueAuthors = [...new Set(newPosts.map((p) => p.data.author))];
      logCrawl(
        "reddit",
        `Fetching avatars for ${uniqueAuthors.length} unique authors`,
      );

      for (const author of uniqueAuthors) {
        authorAvatars[author] = await fetchUserAvatar(author);
        // Rate limiting: 100ms 대기
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const screenshotInfo = getScreenshotDir("reddit");

    const items = [];
    for (const post of newPosts) {
      const p = post.data;
      const postUrl = `https://reddit.com${p.permalink}`;

      let screenshotUrl = null;
      if (!isValidThumbnail(p.thumbnail)) {
        screenshotUrl = await captureRedditScreenshot(
          postUrl,
          p.id,
          screenshotInfo,
        );
      }

      const highQualityImage = getHighQualityImageUrl(p);

      items.push({
        platform: "reddit",
        platform_id: p.id,
        title: p.title,
        description: p.selftext?.slice(0, 500) || null,
        content_text: p.selftext || null,
        url: postUrl,
        author_name: p.author,
        author_url: `https://reddit.com/u/${p.author}`,
        author_avatar: authorAvatars[p.author] || null,
        thumbnail_url:
          highQualityImage ||
          (isValidThumbnail(p.thumbnail) ? p.thumbnail : null),
        screenshot_url: screenshotUrl,
        published_at: new Date(p.created_utc * 1000).toISOString(),
        status: "pending_analysis",
        raw_data: {
          score: p.score,
          num_comments: p.num_comments,
          upvote_ratio: p.upvote_ratio,
          link_flair_text: p.link_flair_text,
          is_video: p.is_video,
          post_hint: p.post_hint,
          highQualityImage,
        },
      });
    }

    // DB에 저장
    const { data: savedData, error } = await upsertCrawledContent(items);

    if (error) {
      throw error;
    }

    logCrawl(
      "reddit",
      `Successfully saved ${savedData?.length || items.length} posts`,
    );
    return { success: true, count: savedData?.length || items.length };
  } catch (error) {
    logCrawl("reddit", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function isValidThumbnail(thumbnail) {
  if (!thumbnail) return false;
  if (thumbnail === "self" || thumbnail === "default" || thumbnail === "nsfw") {
    return false;
  }
  if (thumbnail.includes("redditmedia.com") && thumbnail.includes("?")) {
    return false;
  }
  return thumbnail.startsWith("http");
}

function getHighQualityImageUrl(post) {
  if (post.preview?.images?.[0]?.source?.url) {
    return post.preview.images[0].source.url.replace(/&amp;/g, "&");
  }
  if (
    post.post_hint === "image" &&
    post.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  ) {
    return post.url;
  }
  if (post.url_overridden_by_dest?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return post.url_overridden_by_dest;
  }
  return null;
}

/**
 * Reddit 포스트 스크린샷 캡처
 * @param {string} postUrl - Reddit 포스트 URL
 * @param {string} postId - 포스트 ID
 * @param {{dir: string, urlPrefix: string}} screenshotInfo - 스크린샷 저장 정보
 * @returns {Promise<string|null>} 스크린샷 URL 또는 null
 */
async function captureRedditScreenshot(postUrl, postId, screenshotInfo) {
  let browser = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    const oldRedditUrl = postUrl.replace("reddit.com", "old.reddit.com");
    await page.goto(oldRedditUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    const filename = `post_${postId}.png`;
    const filepath = path.join(screenshotInfo.dir, filename);

    await page.screenshot({
      path: filepath,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });

    await browser.close();
    logCrawl("reddit", `Screenshot saved: ${filename}`);
    return `${screenshotInfo.urlPrefix}/${filename}`;
  } catch (error) {
    if (browser) await browser.close();
    logCrawl("reddit", `Screenshot failed for ${postId}: ${error.message}`);
    return null;
  }
}
