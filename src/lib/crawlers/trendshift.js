import * as cheerio from "cheerio";
import { upsertCrawledContent, logCrawl } from "./index.js";

const BASE_URL = "https://trendshift.io";

// Trendshift에서 지원하는 언어 목록
const SUPPORTED_LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
  "csharp",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "shell",
  "vue",
  "html",
];

/**
 * Trendshift.io 전체 크롤러 (모든 기간 + 언어별)
 * @param {Object} options
 * @param {number} options.limit - 기간별 최대 수집 개수 (기본: 20)
 * @param {boolean} options.includeLanguages - 언어별 크롤링 포함 여부 (기본: false)
 */
export async function crawlTrendshiftAll({ limit = 20, includeLanguages = false } = {}) {
  logCrawl("trendshift", "Starting full crawl");

  const ranges = [1, 7, 30]; // daily, weekly, monthly
  const results = [];

  // 기간별 크롤링
  for (const range of ranges) {
    const result = await crawlTrendshift({ limit, trendingRange: range });
    results.push({ range, ...result });
  }

  // 언어별 크롤링 (선택적)
  if (includeLanguages) {
    for (const language of SUPPORTED_LANGUAGES) {
      const result = await crawlTrendshift({ limit, language });
      results.push({ language, ...result });
    }
  }

  const totalCount = results.reduce((sum, r) => sum + (r.count || 0), 0);
  logCrawl("trendshift", `Completed: ${totalCount} total repos`);

  return {
    success: results.every((r) => r.success),
    count: totalCount,
    details: results,
  };
}

/**
 * Trendshift.io 크롤러
 * GitHub 트렌딩 분석 사이트
 * @param {Object} options
 * @param {number} options.limit - 최대 수집 개수 (기본: 25)
 * @param {number} options.trendingRange - 기간 필터 (1=daily, 7=weekly, 30=monthly)
 * @param {string} options.language - 언어 필터 (예: "python", "javascript")
 */
export async function crawlTrendshift({ limit = 25, trendingRange, language } = {}) {
  const params = new URLSearchParams();
  if (trendingRange) params.set("trending-range", trendingRange);
  if (language) params.set("language", language);

  const url = params.toString() ? `${BASE_URL}?${params.toString()}` : BASE_URL;
  const filterLabel = trendingRange
    ? `range=${trendingRange}`
    : language
      ? `lang=${language}`
      : "default";

  logCrawl("trendshift", `Starting crawl (${filterLabel})`);

  try {
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

    // Trendshift의 레포 카드 파싱
    $("a[href^='/repositories/']").each((i, el) => {
      if (repos.length >= limit) return;

      const $card = $(el).closest(".rounded-lg.border");
      if ($card.length === 0) return;

      // 이미 처리한 카드 skip
      if ($card.data("processed")) return;
      $card.data("processed", true);

      // 레포 링크에서 ID 추출
      const repoHref = $(el).attr("href");
      const repoIdMatch = repoHref?.match(/\/repositories\/(\d+)/);
      if (!repoIdMatch) return;

      const repoId = repoIdMatch[1];

      // 레포 이름 (GitHub 링크에서 추출)
      const githubLink = $card.find('a[href^="https://github.com/"]').attr("href");
      if (!githubLink) return;

      const repoPath = githubLink.replace("https://github.com/", "");
      const [owner, repoName] = repoPath.split("/");
      if (!owner || !repoName) return;

      const fullName = `${owner}/${repoName}`;

      // 설명
      const description = $card.find(".text-xs.leading-5.text-gray-500").first().text().trim() || null;

      // 언어
      const languageSpan = $card.find("span").filter((_, span) => {
        return $(span).find("span[style*='background']").length > 0;
      });
      const language = languageSpan.text().trim() || null;

      // 스타 수 (lucide-star 아이콘 옆)
      let stars = 0;
      $card.find("svg.lucide-star").each((_, svg) => {
        const starsText = $(svg).parent().text().trim();
        const starsMatch = starsText.match(/([\d.]+)k?/i);
        if (starsMatch) {
          stars = starsMatch[1].includes(".")
            ? parseFloat(starsMatch[1]) * 1000
            : parseInt(starsMatch[1], 10);
          if (starsText.toLowerCase().includes("k")) {
            stars = parseFloat(starsMatch[1]) * 1000;
          }
        }
      });

      // 포크 수
      let forks = 0;
      $card.find("svg.lucide-git-fork").each((_, svg) => {
        const forksText = $(svg).parent().text().trim();
        const forksMatch = forksText.match(/([\d.]+)k?/i);
        if (forksMatch) {
          forks = forksMatch[1].includes(".")
            ? parseFloat(forksMatch[1]) * 1000
            : parseInt(forksMatch[1], 10);
          if (forksText.toLowerCase().includes("k")) {
            forks = parseFloat(forksMatch[1]) * 1000;
          }
        }
      });

      // 랭킹
      const rankBadge = $card.find(".bg-amber-300, .bg-secondary").first();
      const rank = parseInt(rankBadge.text().trim(), 10) || i + 1;

      repos.push({
        platform: "trendshift",
        platform_id: `ts-${repoId}`,
        title: fullName,
        description,
        url: githubLink,
        author_name: owner,
        author_url: `https://github.com/${owner}`,
        thumbnail_url: `https://opengraph.githubassets.com/1/${fullName}`,
        status: "pending",
        raw_data: {
          language,
          stars: Math.round(stars),
          forks: Math.round(forks),
          rank,
          trendshiftUrl: `${BASE_URL}${repoHref}`,
          badge_url: `https://trendshift.io/api/badge/repositories/${repoId}`,
        },
      });
    });

    logCrawl("trendshift", `Found ${repos.length} trending repos`);

    if (repos.length === 0) {
      return { success: true, count: 0 };
    }

    // DB에 저장
    const { data: savedData, error } = await upsertCrawledContent(repos);

    if (error) {
      throw error;
    }

    logCrawl("trendshift", `Successfully saved ${savedData?.length || repos.length} repos`);
    return { success: true, count: savedData?.length || repos.length };
  } catch (error) {
    logCrawl("trendshift", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
