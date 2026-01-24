import * as cheerio from "cheerio";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import {
  upsertWithRankingMerge,
  logCrawl,
  getScreenshotDir,
  fetchTrendshiftBadge,
  uploadToSupabaseStorage,
} from "./index.js";

const TRENDING_URL = "https://github.com/trending";

async function fetchReadmeText(repoName) {
  const branches = ["main", "master"];
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${repoName}/${branch}/README.md`;
      const response = await fetch(url, { timeout: 10000 });
      if (response.ok) {
        const text = await response.text();
        return text.slice(0, 8000);
      }
    } catch {}
  }
  return null;
}

// 주요 프로그래밍 언어 (언어별 트렌딩 크롤링용) - 14개
const MAIN_LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "go",
  "rust",
  "java",
  "c++",
  "c",
  "swift",
  "kotlin",
  "php",
  "c#",
  "ruby",
  "dart",
];

/**
 * README 스크린샷 캡처 및 Storage 업로드 (R2 우선)
 */
async function captureReadmeScreenshot(repoUrl, repoName, screenshotInfo) {
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });

    const page = await context.newPage();
    await page.goto(`${repoUrl}#readme`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(1500);

    const filename = `${repoName.replace("/", "-")}_readme.png`;
    const filepath = path.join(screenshotInfo.dir, filename);

    await page.screenshot({
      path: filepath,
      clip: { x: 40, y: 60, width: 800, height: 720 },
    });

    const storagePath = `github/readme/${filename}`;
    const supabaseUrl = await uploadToSupabaseStorage(filepath, storagePath);

    if (supabaseUrl) {
      logCrawl("github", `README screenshot uploaded: ${filename}`);
      return supabaseUrl;
    }

    logCrawl("github", `README screenshot saved locally: ${filename}`);
    return `${screenshotInfo.urlPrefix}/${filename}`;
  } catch (error) {
    logCrawl("github", `Screenshot error for ${repoName}: ${error.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * 스타 히스토리 차트 캡처 및 Storage 업로드 (R2 우선)
 */
async function captureStarHistoryScreenshot(repoName, screenshotInfo) {
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1000, height: 800 },
      deviceScaleFactor: 2,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      acceptDownloads: true,
    });

    const page = await context.newPage();

    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      await page.goto("https://star-history.com", { waitUntil: "networkidle" });
      const tokenLink =
        (await page.$("text=Edit access token")) ||
        (await page.$("text=Add access token"));
      if (tokenLink) {
        await tokenLink.click();
        await page.waitForTimeout(500);
        const tokenInput = await page.$(
          'input:not([placeholder="...add next repository"])',
        );
        if (tokenInput) {
          await tokenInput.fill(githubToken);
          const saveBtn = await page.$('button:has-text("Save")');
          if (saveBtn) await saveBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    const chartUrl = `https://star-history.com/#${repoName}&Date`;
    await page.goto(chartUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page
      .waitForSelector("canvas, svg", { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(3000);

    const tokenRequired = await page.$("text=Add access token");
    const rateLimitText = await page.$("text=API rate limit exceeded");
    if (tokenRequired || rateLimitText) {
      logCrawl("github", `Star history requires GitHub token for ${repoName}`);
      return { needsToken: true, repoName };
    }

    const filename = `${repoName.replace("/", "-")}_stars.png`;
    const filepath = path.join(screenshotInfo.dir, filename);

    let downloadSuccess = false;

    const imageBtn = await page
      .locator("button")
      .filter({ hasText: /^Image$/ })
      .first();
    if ((await imageBtn.count()) > 0) {
      try {
        const downloadPromise = page.waitForEvent("download", {
          timeout: 10000,
        });
        await imageBtn.click();
        const download = await downloadPromise;
        await download.saveAs(filepath);
        downloadSuccess =
          fs.existsSync(filepath) && fs.statSync(filepath).size > 1000;
        if (downloadSuccess) {
          logCrawl(
            "github",
            `Star history downloaded via Image button: ${filename}`,
          );
        }
      } catch (downloadErr) {
        logCrawl(
          "github",
          `Download event failed, falling back to screenshot: ${downloadErr.message}`,
        );
      }
    }

    if (!downloadSuccess) {
      const chartContainer =
        (await page.$(
          ".chart-container, .star-chart, main canvas, main svg",
        )) || (await page.$("main > div > div"));

      if (chartContainer) {
        const box = await chartContainer.boundingBox();
        if (box && box.width > 100 && box.height > 100) {
          await page.screenshot({
            path: filepath,
            clip: {
              x: box.x,
              y: box.y,
              width: Math.min(box.width, 1000),
              height: Math.min(box.height, 600),
            },
          });
        } else {
          await page.screenshot({
            path: filepath,
            clip: { x: 50, y: 280, width: 900, height: 500 },
          });
        }
      } else {
        await page.screenshot({
          path: filepath,
          clip: { x: 50, y: 280, width: 900, height: 500 },
        });
      }
      logCrawl("github", `Star history captured via screenshot: ${filename}`);
    }

    const storagePath = `github/star-history/${filename}`;
    const supabaseUrl = await uploadToSupabaseStorage(filepath, storagePath);

    if (supabaseUrl) {
      return supabaseUrl;
    }

    return `${screenshotInfo.urlPrefix}/${filename}`;
  } catch (error) {
    logCrawl("github", `Star history error for ${repoName}: ${error.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * 레포지토리 세부 정보 보강 (README + 스타 히스토리 스크린샷 + Trendshift 뱃지)
 * @param {Object} repo - 기본 레포 정보
 * @param {{dir: string, urlPrefix: string}} screenshotInfo - 스크린샷 저장 정보
 * @param {Object} options - 추가 옵션
 * @param {boolean} options.fetchBadge - Trendshift 뱃지 수집 여부
 * @returns {Promise<Object>} 보강된 레포 정보
 */
async function enrichRepoDetails(
  repo,
  screenshotInfo,
  { fetchBadge = false } = {},
) {
  const screenshotUrl = await captureReadmeScreenshot(
    repo.url,
    repo.title,
    screenshotInfo,
  );

  const starHistoryResult = await captureStarHistoryScreenshot(
    repo.title,
    screenshotInfo,
  );

  let starHistoryUrl = null;
  let needsGithubToken = false;
  if (starHistoryResult?.needsToken) {
    needsGithubToken = true;
    logCrawl("github", `Token required for star history: ${repo.title}`);
  } else {
    starHistoryUrl = starHistoryResult;
  }

  const readmeText = await fetchReadmeText(repo.title);
  if (readmeText) {
    logCrawl(
      "github",
      `README text fetched: ${repo.title} (${readmeText.length} chars)`,
    );
  }

  let badgeData = {};
  if (fetchBadge) {
    const badge = await fetchTrendshiftBadge(repo.title);
    if (badge) {
      badgeData = {
        trendshift_badge_url: badge.badgeUrl,
        trendshift_badge_rank: badge.badgeRank,
        trendshift_url: badge.trendshiftUrl,
      };
    }
  }

  return {
    ...repo,
    screenshot_url: screenshotUrl,
    content_text: readmeText,
    raw_data: {
      ...repo.raw_data,
      star_history_screenshot: starHistoryUrl,
      needs_github_token: needsGithubToken || undefined,
      ...badgeData,
    },
  };
}

/**
 * GitHub 트렌딩 전체 크롤러 (기간별 + 언어별)
 * @param {Object} options
 * @param {number} options.limit - 기간별 최대 수집 개수 (기본: 20)
 * @param {boolean} options.includeLanguages - 주요 언어별 크롤링 포함 여부 (기본: false)
 * @param {string[]} options.languages - 크롤링할 언어 목록 (기본: MAIN_LANGUAGES)
 */
export async function crawlGithubTrendingAll({
  limit = 20,
  includeLanguages = false,
  languages = MAIN_LANGUAGES,
} = {}) {
  logCrawl("github", `Starting crawl (includeLanguages=${includeLanguages})`);

  const periods = ["daily", "weekly", "monthly"];
  const results = [];

  // 기간별 크롤링 (전체 언어)
  for (const since of periods) {
    const result = await crawlGithubTrending({ since, limit });
    results.push({ since, ...result });
  }

  // 언어별 크롤링 (daily/weekly/monthly 모두)
  if (includeLanguages) {
    logCrawl(
      "github",
      `Crawling ${languages.length} languages × ${periods.length} periods...`,
    );
    for (const language of languages) {
      for (const since of periods) {
        const result = await crawlGithubTrending({ since, limit, language });
        results.push({ language, since, ...result });
      }
    }
  }

  const totalCount = results.reduce((sum, r) => sum + (r.count || 0), 0);
  logCrawl("github", `Completed: ${totalCount} total repos`);

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
 * @param {string} options.language - 언어 필터 (예: "python", "javascript")
 */
export async function crawlGithubTrending({
  since = "weekly",
  limit = 25,
  enrich = true,
  language,
} = {}) {
  const filterLabel = language ? `${since}, lang=${language}` : since;
  logCrawl(
    "github",
    `Starting crawl for trending repos (${filterLabel}), enrich=${enrich}`,
  );

  try {
    // 언어가 있으면 /trending/{language}?since=... 형식
    const url = language
      ? `${TRENDING_URL}/${encodeURIComponent(language)}?since=${since}`
      : `${TRENDING_URL}?since=${since}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

      // 언어 (레포 자체의 언어 - language 파라미터와 구분)
      const repoLanguage =
        $el.find('[itemprop="programmingLanguage"]').text().trim() || null;

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
      const todayStarsMatch = todayStarsText.match(
        /([\d,]+)\s+stars?\s+(today|this week|this month)/i,
      );
      const periodStars = todayStarsMatch
        ? parseInt(todayStarsMatch[1].replace(/,/g, ""), 10)
        : null;

      // 빌트인 by
      const builtBy = [];
      $el.find('img[data-hovercard-type="user"]').each((_, img) => {
        const alt = $(img).attr("alt");
        if (alt) builtBy.push(alt.replace("@", ""));
      });

      // 랭킹 구조: 전체 트렌딩은 { weekly: 5 }, 언어별은 { python: { weekly: 5 } }
      const rankingData = language
        ? { [language]: { [since]: i + 1 } } // 언어별: { python: { weekly: 5 } }
        : { [since]: i + 1 }; // 전체: { daily: 5 } or { weekly: 3 }

      repos.push({
        platform: "github",
        platform_id: fullName.toLowerCase().replace("/", "-"), // 기간 제거 - 동일 레포는 1개 레코드
        title: fullName,
        description,
        url: `https://github.com${repoLink}`,
        author_name: owner,
        author_url: `https://github.com/${owner}`,
        status: "pending_analysis",
        ranking: rankingData,
        raw_data: {
          language: repoLanguage, // 변수명 충돌 해결
          stars,
          forks,
          periodStars,
          builtBy: builtBy.slice(0, 5),
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
      // 스크린샷 저장 폴더 생성 (플랫폼/타임스탬프 구조)
      const screenshotInfo = getScreenshotDir("github");
      logCrawl("github", `Screenshots will be saved to: ${screenshotInfo.dir}`);
      logCrawl(
        "github",
        `Enriching ${repos.length} repos with README images and LLM summaries...`,
      );

      // daily 전체 트렌딩만 Trendshift 뱃지 수집 (top 10)
      const shouldFetchBadges = since === "daily" && !language;
      if (shouldFetchBadges) {
        logCrawl("github", `Will fetch Trendshift badges for top 10 repos`);
      }

      enrichedRepos = [];
      for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        const fetchBadge = shouldFetchBadges && i < 10; // top 10만
        const enriched = await enrichRepoDetails(repo, screenshotInfo, {
          fetchBadge,
        });
        enrichedRepos.push(enriched);
        // Rate limiting: GitHub API 제한 방지
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      logCrawl("github", `Enrichment complete`);
    }

    // DB에 저장 (랭킹 병합 지원)
    const { data: savedData, error } =
      await upsertWithRankingMerge(enrichedRepos);

    if (error) {
      throw error;
    }

    logCrawl(
      "github",
      `Successfully saved ${savedData?.length || enrichedRepos.length} repos`,
    );
    return { success: true, count: savedData?.length || enrichedRepos.length };
  } catch (error) {
    logCrawl("github", `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
