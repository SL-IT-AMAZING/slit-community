import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { logCrawl, getScreenshotDir } from "./index.js";
import { uploadBufferToR2, isR2Configured } from "../storage/r2.js";
import { createClient } from "@supabase/supabase-js";

let supabaseStorage = null;

function getSupabaseStorage() {
  if (!supabaseStorage) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      supabaseStorage = createClient(url, key);
    }
  }
  return supabaseStorage;
}

async function uploadVideoToStorage(videoBuffer, filename, platform) {
  const storagePath = `videos/${platform}/${filename}`;

  if (isR2Configured()) {
    const r2Url = await uploadBufferToR2(videoBuffer, storagePath, "video/mp4");
    if (r2Url) {
      logCrawl(platform, `Video uploaded to R2: ${filename}`);
      return r2Url;
    }
  }

  const supabase = getSupabaseStorage();
  if (!supabase) {
    logCrawl(platform, "Storage not configured, skipping upload");
    return null;
  }

  try {
    const filePath = `${platform}/${filename}`;
    const { error } = await supabase.storage
      .from("videos")
      .upload(filePath, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) {
      logCrawl(platform, `Supabase upload error: ${error.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("videos")
      .getPublicUrl(filePath);
    logCrawl(platform, `Video uploaded to Supabase: ${filename}`);
    return urlData.publicUrl;
  } catch (err) {
    logCrawl(platform, `Storage upload failed: ${err.message}`);
    return null;
  }
}

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
 * @param {{dir: string, urlPrefix: string}} screenshotInfo - 스크린샷 저장 정보
 * @returns {Promise<{screenshot: string, links: Array}>}
 */
export async function crawlWithScreenshot(
  platform,
  url,
  cookies,
  screenshotInfo,
) {
  logCrawl(platform, `Starting screenshot crawl for ${url}`);

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

    // 스크롤하면서 링크 수집 (가상화된 피드 대응)
    const { allLinks, allPosts } = await scrollAndCollect(page, platform);

    // 스크린샷 캡쳐
    const timestamp = Date.now();
    const filename = `feed_${timestamp}.png`;
    const screenshotPath = path.join(screenshotInfo.dir, filename);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
    });

    logCrawl(platform, `Screenshot saved: ${filename}`);

    // 중복 제거된 링크와 포스트
    const links = allLinks;
    const posts = allPosts;

    await browser.close();

    return {
      screenshot: `${screenshotInfo.urlPrefix}/${filename}`,
      links: links.filter((l) => l.href && l.href.startsWith("http")),
      posts,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * 스크롤하면서 링크 수집 (가상화된 피드 대응)
 * 각 스크롤 사이클마다 현재 화면의 링크를 수집
 * 새 콘텐츠가 없으면 조기 종료
 */
async function scrollAndCollect(page, platform) {
  const collectedLinks = new Map(); // href -> link object
  const collectedPosts = new Map(); // text hash -> post object
  let noNewContentCount = 0; // 연속으로 새 콘텐츠 없는 횟수
  const maxNoNewContent = 2; // 2회 연속 새 콘텐츠 없으면 종료

  // 초기 링크 수집
  await collectCurrentLinks(page, collectedLinks);
  await collectCurrentPosts(page, platform, collectedPosts);

  // 최대 8번 스크롤 사이클 수행
  for (let cycle = 0; cycle < 8; cycle++) {
    const prevLinkCount = collectedLinks.size;
    const prevPostCount = collectedPosts.size;

    // 스크롤
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let scrolled = 0;
        const distance = 600;
        const targetScroll = 1500;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          scrolled += distance;
          if (scrolled >= targetScroll) {
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });

    // 콘텐츠 로드 대기
    await page.waitForTimeout(1500 + Math.random() * 1000);

    // 현재 화면의 링크와 포스트 수집
    await collectCurrentLinks(page, collectedLinks);
    await collectCurrentPosts(page, platform, collectedPosts);

    // 새 콘텐츠 체크
    const newLinks = collectedLinks.size - prevLinkCount;
    const newPosts = collectedPosts.size - prevPostCount;

    if (newLinks === 0 && newPosts === 0) {
      noNewContentCount++;
      if (noNewContentCount >= maxNoNewContent) {
        logCrawl(
          platform,
          `No new content after ${cycle + 1} scrolls, stopping early`,
        );
        break;
      }
    } else {
      noNewContentCount = 0; // 새 콘텐츠 있으면 카운터 리셋
    }
  }

  // 맨 위로 스크롤 (스크린샷용)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  return {
    allLinks: Array.from(collectedLinks.values()),
    allPosts: Array.from(collectedPosts.values()),
  };
}

/**
 * 현재 화면의 링크 수집
 */
async function collectCurrentLinks(page, linkMap) {
  const links = await page.$$eval("a[href]", (anchors) =>
    anchors.map((a) => ({
      href: a.href,
      text: a.innerText?.slice(0, 200) || "",
    })),
  );

  links.forEach((link) => {
    if (link.href && link.href.startsWith("http") && !linkMap.has(link.href)) {
      linkMap.set(link.href, link);
    }
  });
}

/**
 * 현재 화면의 포스트 수집
 */
async function collectCurrentPosts(page, platform, postMap) {
  try {
    let posts = [];

    if (platform === "x") {
      posts = await page.$$eval('article[data-testid="tweet"]', (articles) =>
        articles.map((article) => ({
          text: article.innerText?.slice(0, 1000) || "",
        })),
      );
    } else if (platform === "threads") {
      // 더 안정적인 구조 기반 셀렉터 사용
      posts = await page.$$eval(
        'div[data-pressable-container="true"]',
        (containers) => {
          const results = [];
          containers.forEach((container) => {
            const textEl = container.querySelector('div[dir="auto"]');
            const postLink = container.querySelector('a[href*="/post/"]');
            if (textEl && postLink) {
              results.push({
                text: textEl.innerText?.slice(0, 1000) || "",
                url: postLink.href,
              });
            }
          });
          return results;
        },
      );
    }

    posts.forEach((post) => {
      const key = post.text.slice(0, 100); // 첫 100자를 키로 사용
      if (key && !postMap.has(key)) {
        postMap.set(key, post);
      }
    });
  } catch {
    // 에러 무시
  }
}

/**
 * 개별 포스트 상세 정보 추출 (Playwright 사용)
 * @param {string} platform - 플랫폼 (x, threads)
 * @param {string} postUrl - 포스트 URL
 * @param {Array} cookies - 로그인 쿠키
 * @param {{dir: string, urlPrefix: string}} screenshotInfo - 스크린샷 저장 정보
 * @returns {Promise<{content: string, metrics: Object}>}
 */
export async function fetchPostDetails(
  platform,
  postUrl,
  cookies,
  screenshotInfo,
) {
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
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    if (cookies && cookies.length > 0) {
      const normalizedCookies = normalizeCookies(cookies);
      await context.addCookies(normalizedCookies);
    }

    const page = await context.newPage();

    // 포스트 ID 추출 (API 응답 필터링에 사용)
    const postIdMatch =
      postUrl.match(/\/status\/(\d+)/) || postUrl.match(/\/post\/([^/?]+)/);
    const postId = postIdMatch ? postIdMatch[1] : String(Date.now());

    // X 플랫폼인 경우 API 응답에서 YouTube URL 및 Twitter 네이티브 비디오 URL 인터셉트
    let apiYoutubeUrl = null;
    let twitterVideoUrls = [];
    if (platform === "x") {
      page.on("response", async (response) => {
        const url = response.url();
        if (url.includes("/TweetDetail") || url.includes("/graphql")) {
          try {
            const text = await response.text();

            // API 응답을 JSON으로 파싱하여 현재 트윗의 비디오만 추출
            try {
              const data = JSON.parse(text);
              // TweetDetail 응답에서 현재 트윗의 rest_id 확인
              const tweetResult = data?.data?.tweetResult?.result;
              const restId =
                tweetResult?.rest_id || tweetResult?.tweet?.rest_id;

              // 현재 트윗과 일치하는 경우에만 비디오 URL 추출 (댓글 제외)
              if (restId === postId) {
                // 비디오 URL 추출
                const videoPatterns = [
                  /https:\/\/video\.twimg\.com\/amplify_video\/[^"\\]+\.mp4[^"\\]*/g,
                  /https:\/\/video\.twimg\.com\/ext_tw_video\/[^"\\]+\.mp4[^"\\]*/g,
                ];
                for (const pattern of videoPatterns) {
                  const matches = text.matchAll(pattern);
                  for (const match of matches) {
                    let videoUrl = match[0].replace(/\\/g, "");
                    if (!twitterVideoUrls.includes(videoUrl)) {
                      twitterVideoUrls.push(videoUrl);
                      logCrawl(platform, `Video matched for tweet ${postId}`);
                    }
                  }
                }
              }
            } catch {
              // JSON 파싱 실패 시 기존 방식으로 폴백 (단, 첫 번째 응답만)
              if (twitterVideoUrls.length === 0) {
                const videoPatterns = [
                  /https:\/\/video\.twimg\.com\/amplify_video\/[^"\\]+\.mp4[^"\\]*/g,
                  /https:\/\/video\.twimg\.com\/ext_tw_video\/[^"\\]+\.mp4[^"\\]*/g,
                ];
                for (const pattern of videoPatterns) {
                  const matches = text.matchAll(pattern);
                  for (const match of matches) {
                    let videoUrl = match[0].replace(/\\/g, "");
                    if (!twitterVideoUrls.includes(videoUrl)) {
                      twitterVideoUrls.push(videoUrl);
                    }
                  }
                }
              }
            }

            // youtu.be/VIDEO_ID 패턴 찾기
            const shortMatch = text.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
            if (shortMatch && !apiYoutubeUrl) {
              apiYoutubeUrl = `https://youtu.be/${shortMatch[1]}`;
            }
            // youtube.com/watch?v=VIDEO_ID 패턴 찾기
            const watchMatch = text.match(
              /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            );
            if (watchMatch && !apiYoutubeUrl) {
              apiYoutubeUrl = `https://www.youtube.com/watch?v=${watchMatch[1]}`;
            }
          } catch {
            // 응답 파싱 실패 무시
          }
        }
      });
    }

    await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000); // 5초 대기 (로딩 완료)

    // 클립 설정 (본문 전체가 보이도록 왼쪽부터 캡처)
    const viewportWidth = 1280;
    const viewportHeight = 800;
    const contentWidth = platform === "threads" ? 700 : 650;
    const clipX = platform === "threads" ? 290 : 250; // 왼쪽으로 이동
    const clipConfig = {
      x: clipX,
      y: 0,
      width: contentWidth,
      height: viewportHeight,
    };

    // 메트릭스 셀렉터
    const metricsSelector =
      platform === "x"
        ? 'article[data-testid="tweet"] [role="group"]'
        : 'div[data-pressable-container="true"]';

    // 메트릭스가 보일 때까지 스크린샷 캡처 (최대 8번, 모두 저장)
    const screenshots = [];
    const maxAttempts = 8;
    const scrollStep = 700; // 스크롤 단계 증가

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 스크린샷 캡처
      const filename = `post_${postId}_${attempt + 1}.png`;
      const filepath = path.join(screenshotInfo.dir, filename);

      await page.screenshot({
        path: filepath,
        clip: clipConfig,
      });
      screenshots.push(`${screenshotInfo.urlPrefix}/${filename}`);
      logCrawl(platform, `Post screenshot ${attempt + 1} saved: ${filename}`);

      // 메트릭스가 현재 viewport에 보이는지 확인
      const metricsVisible = await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.top < 800 && rect.bottom <= 800;
      }, metricsSelector);

      if (metricsVisible) {
        logCrawl(platform, `Metrics found at attempt ${attempt + 1}`);
        break;
      }

      if (attempt < maxAttempts - 1) {
        logCrawl(platform, `No metrics yet, scrolling...`);
        await page.evaluate((step) => window.scrollBy(0, step), scrollStep);
        await page.waitForTimeout(500);
      }
    }

    let result = {
      content: "",
      metrics: {},
      screenshotUrl: screenshots[0], // 첫 번째 스크린샷 (대표)
      screenshotUrls: screenshots, // 모든 스크린샷
    };

    if (platform === "x") {
      const details = await extractXPostDetails(page);
      result = { ...result, ...details };

      // API 응답에서 가져온 YouTube URL이 있고, DOM에서 못 찾았으면 사용
      if (apiYoutubeUrl && !result.youtubeUrl) {
        result.youtubeUrl = apiYoutubeUrl;
        const videoId = extractYouTubeVideoId(apiYoutubeUrl);
        if (videoId) {
          result.youtubeVideoId = videoId;
          result.youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // Twitter 네이티브 비디오 URL 추가 (720p 또는 1080p 선호)
      if (twitterVideoUrls.length > 0) {
        // 해상도 기준으로 정렬해서 최적 URL 선택
        const selectedVideo = selectBestVideoUrl(twitterVideoUrls);
        if (selectedVideo) {
          result.twitterVideoUrl = selectedVideo;
          result.hasVideo = true;
          logCrawl(
            platform,
            `Twitter video found: ${selectedVideo.substring(0, 80)}...`,
          );
        }
      }
    } else if (platform === "threads") {
      const details = await extractThreadsPostDetails(page);
      result = { ...result, ...details };
    }

    // 미디어 이미지 다운로드
    if (result.mediaUrls && result.mediaUrls.length > 0) {
      const downloadedMedia = [];
      for (let i = 0; i < result.mediaUrls.length; i++) {
        const mediaUrl = result.mediaUrls[i];
        try {
          const response = await fetch(mediaUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const ext = mediaUrl.includes(".png") ? "png" : "jpg";
            const mediaFilename = `media_${postId}_${i}.${ext}`;
            const mediaPath = path.join(screenshotInfo.dir, mediaFilename);
            fs.writeFileSync(mediaPath, Buffer.from(buffer));
            downloadedMedia.push(
              `${screenshotInfo.urlPrefix}/${mediaFilename}`,
            );
            logCrawl(platform, `Media downloaded: ${mediaFilename}`);
          } else {
            logCrawl(
              platform,
              `Media download failed (${response.status}): ${mediaUrl.substring(0, 80)}`,
            );
          }
        } catch (err) {
          logCrawl(platform, `Failed to download media: ${err.message}`);
        }
      }
      result.downloadedMedia = downloadedMedia;
    }

    // Twitter 비디오 다운로드 → Storage 업로드 (R2 우선)
    if (result.twitterVideoUrl && platform === "x") {
      try {
        logCrawl(platform, `Downloading Twitter video...`);
        const videoResponse = await fetch(result.twitterVideoUrl);
        if (videoResponse.ok) {
          const videoBuffer = await videoResponse.arrayBuffer();
          const videoFilename = `video_${postId}.mp4`;
          const sizeMB =
            Math.round((videoBuffer.byteLength / 1024 / 1024) * 10) / 10;
          logCrawl(platform, `Video fetched: ${videoFilename} (${sizeMB}MB)`);

          // Storage 업로드 (R2 우선)
          const storageUrl = await uploadVideoToStorage(
            Buffer.from(videoBuffer),
            videoFilename,
            platform,
          );

          if (storageUrl) {
            result.downloadedVideoUrl = storageUrl;
            logCrawl(platform, `Video uploaded: ${storageUrl}`);
          } else {
            // Storage 실패 시 로컬에 폴백 저장
            const videoPath = path.join(screenshotInfo.dir, videoFilename);
            fs.writeFileSync(videoPath, Buffer.from(videoBuffer));
            result.downloadedVideoUrl = `${screenshotInfo.urlPrefix}/${videoFilename}`;
            logCrawl(
              platform,
              `Video saved locally (fallback): ${videoFilename}`,
            );
          }
        }
      } catch (err) {
        logCrawl(platform, `Failed to download video: ${err.message}`);
      }
    }

    // Threads 비디오 다운로드 → Storage 업로드 (R2 우선)
    if (result.threadsVideoUrl && platform === "threads") {
      try {
        logCrawl(platform, `Downloading Threads video...`);
        const videoResponse = await fetch(result.threadsVideoUrl);
        if (videoResponse.ok) {
          const videoBuffer = await videoResponse.arrayBuffer();
          const videoFilename = `video_${postId}.mp4`;
          const sizeMB =
            Math.round((videoBuffer.byteLength / 1024 / 1024) * 10) / 10;
          logCrawl(platform, `Video fetched: ${videoFilename} (${sizeMB}MB)`);

          // Storage 업로드 (R2 우선)
          const storageUrl = await uploadVideoToStorage(
            Buffer.from(videoBuffer),
            videoFilename,
            platform,
          );

          if (storageUrl) {
            result.downloadedVideoUrl = storageUrl;
            logCrawl(platform, `Video uploaded: ${storageUrl}`);
          } else {
            // Storage 실패 시 로컬에 폴백 저장
            const videoPath = path.join(screenshotInfo.dir, videoFilename);
            fs.writeFileSync(videoPath, Buffer.from(videoBuffer));
            result.downloadedVideoUrl = `${screenshotInfo.urlPrefix}/${videoFilename}`;
            logCrawl(
              platform,
              `Video saved locally (fallback): ${videoFilename}`,
            );
          }
        }
      } catch (err) {
        logCrawl(platform, `Failed to download video: ${err.message}`);
      }
    }

    await browser.close();
    return result;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Twitter 비디오 URL 중 최적 해상도 선택 (720p 또는 1080p 선호)
 */
function selectBestVideoUrl(videoUrls) {
  if (!videoUrls || videoUrls.length === 0) return null;

  // mp4 URL만 필터링
  const mp4Urls = videoUrls.filter((url) => url.includes(".mp4"));
  if (mp4Urls.length === 0) return videoUrls[0];

  // 해상도별 우선순위 (1080p > 720p > 다른 것)
  const resolutionOrder = ["1920x1080", "1280x720", "640x360", "480x270"];

  for (const res of resolutionOrder) {
    const match = mp4Urls.find((url) => url.includes(res));
    if (match) return match;
  }

  // 해상도 정보가 없으면 가장 긴 URL 선택 (보통 가장 높은 화질)
  return mp4Urls.sort((a, b) => b.length - a.length)[0];
}

/**
 * YouTube URL에서 video ID 추출
 */
function extractYouTubeVideoId(url) {
  if (!url) return null;

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
  );
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * X (Twitter) 포스트 - 미디어 URL + 외부 링크 + YouTube 감지
 * 본문은 스크린샷에서 Claude Vision으로 분석
 */
async function extractXPostDetails(page) {
  try {
    const result = await page.evaluate(() => {
      const mediaUrls = [];
      const externalLinks = [];
      const seenUrls = new Set();
      let youtubeUrl = null;

      const article = document.querySelector('article[data-testid="tweet"]');
      if (!article) return { mediaUrls, externalLinks, youtubeUrl };

      // 이미지 추출
      const mediaImages = article.querySelectorAll(
        'div[data-testid="tweetPhoto"] img',
      );
      mediaImages.forEach((img) => {
        const src = img.src;
        if (src && !src.includes("profile_images") && !src.includes("emoji")) {
          const highQualitySrc = src.replace(/&name=\w+/, "&name=large");
          if (!seenUrls.has(highQualitySrc)) {
            mediaUrls.push(highQualitySrc);
            seenUrls.add(highQualitySrc);
          }
        }
      });

      // 비디오 여부만 확인 (포스터는 저장 안 함 - 실제 비디오 재생하므로 불필요)
      const hasVideo = article.querySelectorAll("video[poster]").length > 0;

      // YouTube 카드 감지 (X에 임베드된 YouTube 영상)
      // 1. 직접 href에 YouTube URL이 있는 경우
      const youtubeCard = article.querySelector(
        'a[href*="youtube.com"], a[href*="youtu.be"]',
      );
      if (youtubeCard) {
        youtubeUrl = youtubeCard.href;
      }

      // 2. "youtu.be 방문하기" 같은 텍스트가 있는 링크 감지
      if (!youtubeUrl) {
        const allLinks = article.querySelectorAll("a");
        allLinks.forEach((a) => {
          const text = a.innerText?.toLowerCase() || "";
          const href = a.href || "";
          // 텍스트에 youtu.be 또는 youtube가 포함된 경우
          if (text.includes("youtu.be") || text.includes("youtube")) {
            // t.co 링크인 경우 텍스트에서 URL 추출
            if (href.includes("t.co")) {
              const urlMatch = text.match(
                /(youtu\.be\/[a-zA-Z0-9_-]+|youtube\.com\/watch\?v=[a-zA-Z0-9_-]+)/i,
              );
              if (urlMatch) {
                youtubeUrl = "https://" + urlMatch[1];
              }
            } else {
              youtubeUrl = href;
            }
          }
        });
      }

      // 3. 카드 영역에서 YouTube 도메인 텍스트 감지
      if (!youtubeUrl) {
        const cardText = article.innerText || "";
        const youtubeMatch = cardText.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (youtubeMatch) {
          youtubeUrl = "https://youtu.be/" + youtubeMatch[1];
        }
      }

      // 외부 링크 추출 (t.co 링크에서 실제 URL은 title 속성에 있음)
      const links = article.querySelectorAll('a[href*="t.co"]');
      links.forEach((a) => {
        // X는 링크의 실제 URL을 표시 텍스트나 title에 보여줌
        const displayedUrl = a.innerText?.trim();
        // t.co가 아닌 실제 URL이 표시되어 있으면 그것을 사용
        if (
          displayedUrl &&
          !displayedUrl.includes("t.co") &&
          displayedUrl.includes(".")
        ) {
          // 프로토콜 추가
          let fullUrl = displayedUrl;
          if (!fullUrl.startsWith("http")) {
            fullUrl = "https://" + fullUrl;
          }

          // YouTube URL 감지
          if (fullUrl.includes("youtube.com") || fullUrl.includes("youtu.be")) {
            if (!youtubeUrl) {
              youtubeUrl = fullUrl;
            }
          }

          // ... 으로 잘린 URL 처리 (일단 표시된 대로 저장)
          if (!seenUrls.has(fullUrl)) {
            externalLinks.push({
              url: fullUrl,
              text: displayedUrl,
              shortUrl: a.href,
            });
            seenUrls.add(fullUrl);
          }
        }
      });

      return { mediaUrls, externalLinks, hasVideo, youtubeUrl };
    });

    // YouTube video ID 추출 및 임베드 URL 생성
    if (result.youtubeUrl) {
      const videoId = extractYouTubeVideoId(result.youtubeUrl);
      if (videoId) {
        result.youtubeVideoId = videoId;
        result.youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return result;
  } catch (error) {
    return {
      mediaUrls: [],
      externalLinks: [],
      hasVideo: false,
      youtubeUrl: null,
      error: error.message,
    };
  }
}

/**
 * Threads 포스트 - 미디어 URL + 외부 링크 추출
 * 본문은 스크린샷에서 Claude Vision으로 분석
 */
async function extractThreadsPostDetails(page) {
  try {
    const result = await page.evaluate(() => {
      const mediaUrls = [];
      const externalLinks = [];
      const seenUrls = new Set();

      // 이미지 추출 (다양한 CDN 패턴 지원)
      const imageSelectors = [
        'img[src*="cdninstagram.com"]',
        'img[src*="scontent"]', // Instagram 대체 CDN
        'img[src*="fbcdn.net"]', // Facebook CDN
      ].join(",");

      const images = document.querySelectorAll(imageSelectors);
      images.forEach((img) => {
        const src = img.src;
        if (!src) return;

        // 프로필/이모지/아이콘 필터링
        const isProfile =
          src.includes("150x150") ||
          src.includes("44x44") ||
          src.includes("profile");
        const isEmoji = src.includes("emoji") || src.includes("static");
        const isIcon = img.width < 50 || img.height < 50;

        if (!isProfile && !isEmoji && !isIcon && !seenUrls.has(src)) {
          mediaUrls.push(src);
          seenUrls.add(src);
        }
      });

      // 비디오 여부만 확인 (포스터는 저장 안 함 - 실제 비디오 재생하므로 불필요)
      const hasVideo = document.querySelectorAll("video[poster]").length > 0;

      // 외부 링크 추출 (l.threads.com 리다이렉트 디코딩)
      const links = document.querySelectorAll(
        'a[href*="l.threads.com"], a[href*="l.instagram.com"]',
      );
      links.forEach((a) => {
        try {
          const url = new URL(a.href);
          const targetUrl = url.searchParams.get("u");
          if (targetUrl) {
            const decodedUrl = decodeURIComponent(targetUrl);
            if (!seenUrls.has(decodedUrl)) {
              externalLinks.push({
                url: decodedUrl,
                text: a.innerText?.trim().slice(0, 100) || "",
              });
              seenUrls.add(decodedUrl);
            }
          }
        } catch (e) {
          // URL 파싱 실패 무시
        }
      });

      return { mediaUrls, externalLinks, hasVideo };
    });

    return result;
  } catch (error) {
    return {
      mediaUrls: [],
      externalLinks: [],
      hasVideo: false,
      error: error.message,
    };
  }
}

/**
 * 만료된 쿠키 필터링
 */
function filterExpiredCookies(cookies, platform) {
  const now = Date.now() / 1000;
  const validCookies = cookies.filter(
    (c) => !c.expirationDate || c.expirationDate > now,
  );

  if (validCookies.length < cookies.length) {
    const expiredCount = cookies.length - validCookies.length;
    logCrawl(platform, `Warning: ${expiredCount} expired cookies filtered out`);
  }

  if (validCookies.length === 0) {
    logCrawl(platform, `Error: All cookies expired. Please refresh cookies.`);
    return null;
  }

  return validCookies;
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
    const cookies = JSON.parse(data);
    return filterExpiredCookies(cookies, platform);
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
    const cookies = JSON.parse(cookiesJson);
    return filterExpiredCookies(cookies, platform);
  } catch (error) {
    logCrawl(platform, `Error parsing cookies from env: ${error.message}`);
    return null;
  }
}
