import * as cheerio from "cheerio";
import { upsertCrawledContent, logCrawl } from "./index.js";

const TRENDING_URL = "https://github.com/trending";

/**
 * GitHub 트렌딩 전체 크롤러 (daily, weekly, monthly 모두)
 * @param {Object} options
 * @param {number} options.limit - 기간별 최대 수집 개수 (기본: 20)
 */
export async function crawlGithubTrendingAll({ limit = 20 } = {}) {
  logCrawl("github", "Starting crawl for all trending periods");

  const periods = ["daily", "weekly", "monthly"];
  const results = [];

  for (const since of periods) {
    const result = await crawlGithubTrending({ since, limit });
    results.push({ since, ...result });
  }

  const totalCount = results.reduce((sum, r) => sum + (r.count || 0), 0);
  logCrawl("github", `Completed all periods: ${totalCount} total repos`);

  return {
    success: results.every((r) => r.success),
    count: totalCount,
    details: results,
  };
}

/**
 * GitHub 트렌딩 크롤러
 * @param {Object} options
 * @param {string} options.since - 기간 (daily, weekly, monthly)
 * @param {number} options.limit - 최대 수집 개수 (기본: 25)
 */
export async function crawlGithubTrending({ since = "weekly", limit = 25 } = {}) {
  logCrawl("github", `Starting crawl for trending repos (${since})`);

  try {
    const url = `${TRENDING_URL}?since=${since}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const repos = [];

    $("article.Box-row").each((i, el) => {
      if (i >= limit) return;

      const $el = $(el);

      // 레포 이름 추출
      const repoLink = $el.find("h2 a").attr("href");
      if (!repoLink) return;

      const [owner, repoName] = repoLink.slice(1).split("/");
      const fullName = `${owner}/${repoName}`;

      // 설명
      const description = $el.find("p.col-9").text().trim() || null;

      // 언어
      const language = $el.find('[itemprop="programmingLanguage"]').text().trim() || null;

      // 스타 수
      const starsText = $el
        .find('a[href$="/stargazers"]')
        .text()
        .trim()
        .replace(/,/g, "");
      const stars = parseInt(starsText, 10) || 0;

      // 포크 수
      const forksText = $el
        .find('a[href$="/forks"]')
        .text()
        .trim()
        .replace(/,/g, "");
      const forks = parseInt(forksText, 10) || 0;

      // 오늘/이번주/이번달 스타
      const todayStarsText = $el.find(".float-sm-right").text().trim();
      const todayStarsMatch = todayStarsText.match(/([\d,]+)\s+stars?\s+(today|this week|this month)/i);
      const periodStars = todayStarsMatch
        ? parseInt(todayStarsMatch[1].replace(/,/g, ""), 10)
        : null;

      // 빌트인 by
      const builtBy = [];
      $el.find('img[data-hovercard-type="user"]').each((_, img) => {
        const alt = $(img).attr("alt");
        if (alt) builtBy.push(alt.replace("@", ""));
      });

      repos.push({
        platform: "github",
        platform_id: fullName.toLowerCase().replace("/", "-"),
        title: fullName,
        description,
        url: `https://github.com${repoLink}`,
        author_name: owner,
        author_url: `https://github.com/${owner}`,
        thumbnail_url: `https://opengraph.githubassets.com/1/${fullName}`,
        status: "pending",
        raw_data: {
          language,
          stars,
          forks,
          periodStars,
          since,
          builtBy: builtBy.slice(0, 5),
          star_history_url: `https://api.star-history.com/svg?repos=${fullName}&type=Date`,
        },
      });
    });

    logCrawl("github", `Found ${repos.length} trending repos`);

    if (repos.length === 0) {
      return { success: true, count: 0 };
    }

    // DB에 저장
    const { data: savedData, error } = await upsertCrawledContent(repos);

    if (error) {
      throw error;
    }

    logCrawl("github", `Successfully saved ${savedData?.length || repos.length} repos`);
    return { success: true, count: savedData?.length || repos.length };
  } catch (error) {
    logCrawl("github", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
