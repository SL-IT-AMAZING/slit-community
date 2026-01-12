import { upsertCrawledContent, getExistingPlatformIds, logCrawl } from "./index.js";

const SUBREDDIT = "vibecoding";
const FETCH_LIMIT = 20;

/**
 * Reddit r/vibecoding 크롤러
 * JSON endpoint 사용 (인증 불필요)
 * @param {Object} options
 * @param {number} options.limit - 최대 수집 개수 (기본: 20)
 */
export async function crawlReddit({ limit = FETCH_LIMIT } = {}) {
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

    // 데이터 변환
    const items = newPosts.map((post) => {
      const p = post.data;
      return {
        platform: "reddit",
        platform_id: p.id,
        title: p.title,
        description: p.selftext?.slice(0, 500) || null,
        content_text: p.selftext || null,
        url: `https://reddit.com${p.permalink}`,
        author_name: p.author,
        author_url: `https://reddit.com/u/${p.author}`,
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
      };
    });

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
