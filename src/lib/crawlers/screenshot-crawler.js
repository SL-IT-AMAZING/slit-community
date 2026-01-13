import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { logCrawl } from "./index.js";

// 스크린샷 저장 디렉토리
const SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots");

/**
 * Cookie-Editor 형식을 Playwright 형식으로 변환
 */
function normalizeCookies(cookies) {
  return cookies.map((cookie) => {
    const normalized = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || "/",
    };

    // sameSite 변환
    if (cookie.sameSite === "no_restriction") {
      normalized.sameSite = "None";
    } else if (cookie.sameSite === "lax") {
      normalized.sameSite = "Lax";
    } else if (cookie.sameSite === "strict") {
      normalized.sameSite = "Strict";
    }
    // null이나 undefined면 sameSite 생략

    // 선택적 필드
    if (cookie.secure !== undefined) normalized.secure = cookie.secure;
    if (cookie.httpOnly !== undefined) normalized.httpOnly = cookie.httpOnly;
    if (cookie.expirationDate) normalized.expires = cookie.expirationDate;

    return normalized;
  });
}

/**
 * Playwright 기반 스크린샷 크롤러
 * @param {string} platform - 플랫폼 이름
 * @param {string} url - 크롤링 URL
 * @param {Array} cookies - 로그인 쿠키
 * @returns {Promise<{screenshot: string, links: Array}>}
 */
export async function crawlWithScreenshot(platform, url, cookies) {
  logCrawl(platform, `Starting screenshot crawl for ${url}`);

  // 스크린샷 디렉토리 생성
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    // 쿠키 설정 (로그인 세션)
    if (cookies && cookies.length > 0) {
      const normalizedCookies = normalizeCookies(cookies);
      await context.addCookies(normalizedCookies);
    }

    const page = await context.newPage();

    // 페이지 로드 (domcontentloaded 사용 - networkidle은 X에서 타임아웃 발생)
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // 콘텐츠 로딩 대기 (X, Threads 등은 JS로 동적 로딩)
    await page.waitForTimeout(8000);

    // 랜덤 딜레이 (봇 감지 방지)
    await page.waitForTimeout(1000 + Math.random() * 2000);

    // 스크롤해서 콘텐츠 로드
    await autoScroll(page);

    // 스크린샷 캡쳐
    const timestamp = Date.now();
    const screenshotPath = path.join(SCREENSHOT_DIR, `${platform}_${timestamp}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
    });

    logCrawl(platform, `Screenshot saved: ${screenshotPath}`);

    // 모든 링크 수집
    const links = await page.$$eval("a[href]", (anchors) =>
      anchors.map((a) => ({
        href: a.href,
        text: a.innerText?.slice(0, 200) || "",
      }))
    );

    // 게시물 텍스트 수집 (플랫폼별로 다름)
    const posts = await extractPosts(page, platform);

    await browser.close();

    return {
      screenshot: `/screenshots/${platform}_${timestamp}.png`,
      links: links.filter((l) => l.href && l.href.startsWith("http")),
      posts,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * 자동 스크롤
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= 3000) {
          // 최대 3000px 스크롤
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

/**
 * 플랫폼별 게시물 추출
 */
async function extractPosts(page, platform) {
  try {
    switch (platform) {
      case "x":
        return await page.$$eval('article[data-testid="tweet"]', (articles) =>
          articles.slice(0, 20).map((article) => ({
            text: article.innerText?.slice(0, 1000) || "",
          }))
        );

      case "threads":
        return await page.$$eval('[class*="Thread"]', (posts) =>
          posts.slice(0, 20).map((post) => ({
            text: post.innerText?.slice(0, 1000) || "",
          }))
        );

      default:
        return [];
    }
  } catch {
    return [];
  }
}

/**
 * 개별 포스트 상세 정보 추출 (Playwright 사용)
 * @param {string} platform - 플랫폼 (x, threads)
 * @param {string} postUrl - 포스트 URL
 * @param {Array} cookies - 로그인 쿠키
 * @returns {Promise<{content: string, metrics: Object}>}
 */
export async function fetchPostDetails(platform, postUrl, cookies) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    if (cookies && cookies.length > 0) {
      const normalizedCookies = normalizeCookies(cookies);
      await context.addCookies(normalizedCookies);
    }

    const page = await context.newPage();
    await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    let result = { content: "", metrics: {} };

    if (platform === "x") {
      result = await extractXPostDetails(page);
    } else if (platform === "threads") {
      result = await extractThreadsPostDetails(page);
    }

    await browser.close();
    return result;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * X (Twitter) 포스트 상세 정보 추출
 */
async function extractXPostDetails(page) {
  try {
    // 트윗 본문 추출
    const content = await page.$eval(
      'article[data-testid="tweet"] div[data-testid="tweetText"]',
      (el) => el.innerText || ""
    ).catch(() => "");

    // 프로필 정보, 시간, 미디어, 메트릭 추출
    const postData = await page.evaluate(() => {
      const result = {
        authorAvatar: null,
        authorName: null,
        authorHandle: null,
        publishedAt: null,
        mediaUrls: [],
        metrics: { likes: 0, retweets: 0, replies: 0, quotes: 0, views: 0 },
      };

      const article = document.querySelector('article[data-testid="tweet"]');
      if (!article) return result;

      // 프로필 사진 추출
      const avatarImg = article.querySelector('img[data-testid="Tweet-User-Avatar"]') ||
                        article.querySelector('div[data-testid="Tweet-User-Avatar"] img');
      if (avatarImg) {
        result.authorAvatar = avatarImg.src;
      }

      // 작성자 이름과 핸들 추출
      const userNameEl = article.querySelector('div[data-testid="User-Name"]');
      if (userNameEl) {
        const spans = userNameEl.querySelectorAll('span');
        for (const span of spans) {
          const text = span.innerText?.trim();
          if (text && text.startsWith('@')) {
            result.authorHandle = text;
          } else if (text && text.length > 0 && !text.includes('·') && !result.authorName) {
            result.authorName = text;
          }
        }
      }

      // 게시 시간 추출
      const timeEl = article.querySelector('time[datetime]');
      if (timeEl) {
        result.publishedAt = timeEl.getAttribute('datetime');
      }

      // 미디어 URL 추출 (이미지, 비디오)
      const mediaImages = article.querySelectorAll('div[data-testid="tweetPhoto"] img');
      mediaImages.forEach((img) => {
        const src = img.src;
        if (src && !src.includes('profile_images') && !src.includes('emoji')) {
          // 고화질 이미지로 변환
          const highQualitySrc = src.replace(/&name=\w+/, '&name=large');
          result.mediaUrls.push(highQualitySrc);
        }
      });

      // 비디오 포스터 이미지 추출
      const videoPosters = article.querySelectorAll('video[poster]');
      videoPosters.forEach((video) => {
        const poster = video.getAttribute('poster');
        if (poster) {
          result.mediaUrls.push(poster);
        }
      });

      // 좋아요 버튼
      const likeBtn = article.querySelector('[data-testid="like"]');
      if (likeBtn) {
        const likeText = likeBtn.getAttribute("aria-label") || "";
        const likeMatch = likeText.match(/([\d,]+)\s*(likes?|좋아요)/i);
        if (likeMatch) result.metrics.likes = parseInt(likeMatch[1].replace(/,/g, ""), 10);
      }

      // 리트윗 버튼
      const retweetBtn = article.querySelector('[data-testid="retweet"]');
      if (retweetBtn) {
        const rtText = retweetBtn.getAttribute("aria-label") || "";
        const rtMatch = rtText.match(/([\d,]+)\s*(retweets?|리트윗)/i);
        if (rtMatch) result.metrics.retweets = parseInt(rtMatch[1].replace(/,/g, ""), 10);
      }

      // 답글 버튼
      const replyBtn = article.querySelector('[data-testid="reply"]');
      if (replyBtn) {
        const replyText = replyBtn.getAttribute("aria-label") || "";
        const replyMatch = replyText.match(/([\d,]+)\s*(replies?|답글)/i);
        if (replyMatch) result.metrics.replies = parseInt(replyMatch[1].replace(/,/g, ""), 10);
      }

      // 조회수 (analytics link에서)
      const viewsEl = article.querySelector('a[href*="/analytics"]');
      if (viewsEl) {
        const viewsText = viewsEl.innerText || "";
        const viewsMatch = viewsText.match(/([\d,.]+)([KkMm])?/);
        if (viewsMatch) {
          let views = parseFloat(viewsMatch[1].replace(/,/g, ""));
          if (viewsMatch[2]?.toLowerCase() === "k") views *= 1000;
          if (viewsMatch[2]?.toLowerCase() === "m") views *= 1000000;
          result.metrics.views = Math.round(views);
        }
      }

      return result;
    });

    return {
      content,
      authorAvatar: postData.authorAvatar,
      authorName: postData.authorName,
      authorHandle: postData.authorHandle,
      publishedAt: postData.publishedAt,
      mediaUrls: postData.mediaUrls,
      metrics: postData.metrics,
    };
  } catch (error) {
    return { content: "", metrics: {}, error: error.message };
  }
}

/**
 * Threads 포스트 상세 정보 추출
 */
async function extractThreadsPostDetails(page) {
  try {
    // 종합 데이터 추출
    const postData = await page.evaluate(() => {
      const result = {
        content: "",
        authorAvatar: null,
        authorName: null,
        authorHandle: null,
        publishedAt: null,
        mediaUrls: [],
        metrics: { likes: 0, replies: 0, reposts: 0, shares: 0 },
      };

      // 포스트 본문 추출
      const textSelectors = [
        '[data-pressable-container="true"] span',
        'div[dir="auto"] span',
        'article span',
      ];

      for (const selector of textSelectors) {
        const els = document.querySelectorAll(selector);
        for (const el of els) {
          const text = el.innerText?.trim();
          if (text && text.length > 10 && !text.includes("Follow") && !text.includes("팔로우")) {
            result.content = text;
            break;
          }
        }
        if (result.content) break;
      }

      // 프로필 사진 추출
      const avatarSelectors = [
        'img[data-testid="user-avatar"]',
        'a[role="link"] img[alt]',
        'div[role="button"] img[alt]',
      ];
      for (const selector of avatarSelectors) {
        const img = document.querySelector(selector);
        if (img && img.src && img.src.includes('cdninstagram.com')) {
          result.authorAvatar = img.src;
          break;
        }
      }

      // 작성자 이름/핸들 추출
      const usernameEl = document.querySelector('a[role="link"] span[dir="auto"]');
      if (usernameEl) {
        const text = usernameEl.innerText?.trim();
        if (text && !text.includes(' ')) {
          result.authorHandle = text.startsWith('@') ? text : `@${text}`;
          result.authorName = text.replace('@', '');
        }
      }

      // 게시 시간 추출
      const timeEl = document.querySelector('time[datetime]');
      if (timeEl) {
        result.publishedAt = timeEl.getAttribute('datetime');
      } else {
        // 상대 시간에서 추출 시도
        const timeTextEl = document.querySelector('[class*="time"]') ||
                          document.querySelector('span:contains("h"), span:contains("m"), span:contains("d")');
        if (timeTextEl) {
          // 상대 시간은 그대로 저장 (클라이언트에서 처리)
        }
      }

      // 미디어 URL 추출
      const mediaImages = document.querySelectorAll('img[style*="object-fit"]');
      mediaImages.forEach((img) => {
        const src = img.src;
        if (src && src.includes('cdninstagram.com') && !src.includes('150x150')) {
          result.mediaUrls.push(src);
        }
      });

      // 비디오 추출
      const videos = document.querySelectorAll('video[src], video source[src]');
      videos.forEach((video) => {
        const src = video.src || video.getAttribute('src');
        if (src) {
          result.mediaUrls.push(src);
        }
      });

      // 메트릭 추출
      const text = document.body.innerText || "";

      // 좋아요 패턴
      const likePatterns = [
        /(\d+(?:,\d+)*)\s*(?:likes?|좋아요)/i,
        /좋아요\s*(\d+(?:,\d+)*)/i,
      ];
      for (const pattern of likePatterns) {
        const match = text.match(pattern);
        if (match) {
          result.metrics.likes = parseInt(match[1].replace(/,/g, ""), 10);
          break;
        }
      }

      // 답글 패턴
      const replyPatterns = [
        /(\d+(?:,\d+)*)\s*(?:replies?|답글)/i,
        /답글\s*(\d+(?:,\d+)*)/i,
      ];
      for (const pattern of replyPatterns) {
        const match = text.match(pattern);
        if (match) {
          result.metrics.replies = parseInt(match[1].replace(/,/g, ""), 10);
          break;
        }
      }

      // 리포스트 패턴
      const repostPatterns = [
        /(\d+(?:,\d+)*)\s*(?:reposts?|리포스트)/i,
        /리포스트\s*(\d+(?:,\d+)*)/i,
      ];
      for (const pattern of repostPatterns) {
        const match = text.match(pattern);
        if (match) {
          result.metrics.reposts = parseInt(match[1].replace(/,/g, ""), 10);
          break;
        }
      }

      // 보내기/공유 패턴
      const sharePatterns = [
        /(\d+(?:,\d+)*)\s*(?:shares?|보내기|공유)/i,
        /보내기\s*(\d+(?:,\d+)*)/i,
      ];
      for (const pattern of sharePatterns) {
        const match = text.match(pattern);
        if (match) {
          result.metrics.shares = parseInt(match[1].replace(/,/g, ""), 10);
          break;
        }
      }

      return result;
    });

    return {
      content: postData.content,
      authorAvatar: postData.authorAvatar,
      authorName: postData.authorName,
      authorHandle: postData.authorHandle,
      publishedAt: postData.publishedAt,
      mediaUrls: postData.mediaUrls,
      metrics: postData.metrics,
    };
  } catch (error) {
    return { content: "", metrics: {}, error: error.message };
  }
}

/**
 * 쿠키 파일 로드
 */
export function loadCookies(platform) {
  const cookiePath = path.join(process.cwd(), "cookies", `${platform}.json`);

  if (!fs.existsSync(cookiePath)) {
    logCrawl(platform, `Cookie file not found: ${cookiePath}`);
    return null;
  }

  try {
    const data = fs.readFileSync(cookiePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    logCrawl(platform, `Error loading cookies: ${error.message}`);
    return null;
  }
}

/**
 * 쿠키 환경변수에서 로드
 */
export function loadCookiesFromEnv(platform) {
  const envKey = `${platform.toUpperCase()}_COOKIES`;
  const cookiesJson = process.env[envKey];

  if (!cookiesJson) {
    logCrawl(platform, `Cookie env var not found: ${envKey}`);
    return null;
  }

  try {
    return JSON.parse(cookiesJson);
  } catch (error) {
    logCrawl(platform, `Error parsing cookies from env: ${error.message}`);
    return null;
  }
}
