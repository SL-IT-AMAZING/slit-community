import * as cheerio from "cheerio";
import { upsertCrawledContent, logCrawl } from "./index.js";
import { summarizeRepo } from "./llm.js";

const TRENDING_URL = "https://github.com/trending";

/**
 * GitHub README에서 첫 번째 이미지 URL 추출
 * @param {string} readmeContent - README raw content (markdown)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {string|null} First image URL or null
 */
function extractReadmeImage(readmeContent, owner, repo) {
  if (!readmeContent) return null;

  // Markdown 이미지: ![alt](url)
  const mdImageMatch = readmeContent.match(/!\[.*?\]\(([^)]+)\)/);
  if (mdImageMatch && mdImageMatch[1]) {
    let imageUrl = mdImageMatch[1];
    // 상대 경로를 절대 경로로 변환
    if (!imageUrl.startsWith("http")) {
      // ./images/logo.png → https://raw.githubusercontent.com/owner/repo/main/images/logo.png
      imageUrl = imageUrl.replace(/^\.\//, "").replace(/^\//, "");
      imageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${imageUrl}`;
    }
    return imageUrl;
  }

  // HTML img 태그: <img src="url">
  const htmlImageMatch = readmeContent.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlImageMatch && htmlImageMatch[1]) {
    let imageUrl = htmlImageMatch[1];
    if (!imageUrl.startsWith("http")) {
      imageUrl = imageUrl.replace(/^\.\//, "").replace(/^\//, "");
      imageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${imageUrl}`;
    }
    return imageUrl;
  }

  return null;
}

/**
 * GitHub README 조회
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<string|null>} README content or null
 */
async function fetchReadme(owner, repo) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.raw",
          "User-Agent": "Kiev-Crawler",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch (error) {
    logCrawl("github", `Error fetching README for ${owner}/${repo}: ${error.message}`);
    return null;
  }
}

// summarizeRepo는 llm.js에서 import

/**
 * 레포지토리 세부 정보 보강 (README 이미지, LLM 요약)
 * @param {Object} repo - 기본 레포 정보
 * @returns {Promise<Object>} 보강된 레포 정보
 */
async function enrichRepoDetails(repo) {
  const [owner, repoName] = repo.title.split("/");

  // README 조회
  const readmeContent = await fetchReadme(owner, repoName);

  // README 이미지 추출
  const readmeImage = extractReadmeImage(readmeContent, owner, repoName);

  // LLM 요약 생성 (API 키가 있고 README가 있는 경우에만)
  let llmSummary = null;
  if (readmeContent && readmeContent.length > 100) {
    llmSummary = await summarizeRepo(
      repo.title,
      repo.description,
      readmeContent,
      repo.raw_data.language
    );
  }

  return {
    ...repo,
    thumbnail_url: readmeImage || repo.thumbnail_url,
    raw_data: {
      ...repo.raw_data,
      readme_image: readmeImage,
      llm_summary: llmSummary,
    },
  };
}

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
 * @param {boolean} options.enrich - README 이미지/LLM 요약 추가 여부 (기본: true)
 */
export async function crawlGithubTrending({ since = "weekly", limit = 25, enrich = true } = {}) {
  logCrawl("github", `Starting crawl for trending repos (${since}), enrich=${enrich}`);

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

    // README 이미지 및 LLM 요약 추가 (enrich 옵션이 true인 경우)
    let enrichedRepos = repos;
    if (enrich) {
      logCrawl("github", `Enriching ${repos.length} repos with README images and LLM summaries...`);
      enrichedRepos = [];
      for (const repo of repos) {
        const enriched = await enrichRepoDetails(repo);
        enrichedRepos.push(enriched);
        // Rate limiting: GitHub API 제한 방지
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      logCrawl("github", `Enrichment complete`);
    }

    // DB에 저장
    const { data: savedData, error } = await upsertCrawledContent(enrichedRepos);

    if (error) {
      throw error;
    }

    logCrawl("github", `Successfully saved ${savedData?.length || enrichedRepos.length} repos`);
    return { success: true, count: savedData?.length || enrichedRepos.length };
  } catch (error) {
    logCrawl("github", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
