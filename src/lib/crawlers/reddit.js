import { upsertCrawledContent, getExistingPlatformIds, logCrawl } from "./index.js";
import { translateTitle, translateContent } from "./translate.js";

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
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      }
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
export async function crawlReddit({ limit = FETCH_LIMIT, fetchAvatars = true } = {}) {
  logCrawl("reddit", `Starting crawl for r/${SUBREDDIT}`);

  try {
    const response = await fetch(
      `https://old.reddit.com/r/${SUBREDDIT}/new.json?limit=${limit}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      }
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

    logCrawl("reddit", `New posts: ${newPosts.length}, Duplicates: ${existingIds.size}`);

    if (newPosts.length === 0) {
      logCrawl("reddit", "No new posts to save");
      return { success: true, count: 0 };
    }

    // 프로필 사진 일괄 조회 (rate limiting을 위해 순차 처리)
    const authorAvatars = {};
    if (fetchAvatars) {
      const uniqueAuthors = [...new Set(newPosts.map((p) => p.data.author))];
      logCrawl("reddit", `Fetching avatars for ${uniqueAuthors.length} unique authors`);

      for (const author of uniqueAuthors) {
        authorAvatars[author] = await fetchUserAvatar(author);
        // Rate limiting: 100ms 대기
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // 데이터 변환 + 번역
    logCrawl("reddit", "Translating posts...");
    const items = [];

    for (const post of newPosts) {
      const p = post.data;

      // 제목/본문 번역
      const translatedTitleText = await translateTitle(p.title);
      const translatedContentText = p.selftext ? await translateContent(p.selftext) : null;

      items.push({
        platform: "reddit",
        platform_id: p.id,
        title: p.title,
        translated_title: translatedTitleText,
        description: p.selftext?.slice(0, 500) || null,
        content_text: p.selftext || null,
        translated_content: translatedContentText,
        url: `https://reddit.com${p.permalink}`,
        author_name: p.author,
        author_url: `https://reddit.com/u/${p.author}`,
        author_avatar: authorAvatars[p.author] || null,
        thumbnail_url: isValidThumbnail(p.thumbnail) ? p.thumbnail : null,
        published_at: new Date(p.created_utc * 1000).toISOString(),
        status: "pending",
        raw_data: {
          score: p.score,
          num_comments: p.num_comments,
          upvote_ratio: p.upvote_ratio,
          link_flair_text: p.link_flair_text,
          is_video: p.is_video,
          post_hint: p.post_hint,
        },
      });

      // Rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    // DB에 저장
    const { data: savedData, error } = await upsertCrawledContent(items);

    if (error) {
      throw error;
    }

    logCrawl("reddit", `Successfully saved ${savedData?.length || items.length} posts`);
    return { success: true, count: savedData?.length || items.length };
  } catch (error) {
    logCrawl("reddit", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 유효한 썸네일 URL인지 확인
 */
function isValidThumbnail(thumbnail) {
  if (!thumbnail) return false;
  if (thumbnail === "self" || thumbnail === "default" || thumbnail === "nsfw") {
    return false;
  }
  return thumbnail.startsWith("http");
}
