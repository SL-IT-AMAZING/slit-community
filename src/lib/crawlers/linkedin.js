import { upsertCrawledContent, logCrawl } from "./index.js";
import { parseRelativeTime } from "./llm.js";

/**
 * LinkedIn 스크린샷 크롤러
 * 분석은 Claude 에이전트가 직접 처리
 */

/**
 * LinkedIn 스크린샷 분석 (Claude 에이전트가 처리)
 * @param {string} imageUrl - 스크린샷 이미지 URL
 * @param {string} postUrl - LinkedIn 포스트 URL (optional)
 * @returns {Promise<Object>} 분석 결과
 */
export async function analyzeLinkedInScreenshot(imageUrl, postUrl = null) {
  logCrawl("linkedin", "LinkedIn 분석은 Claude 에이전트가 처리합니다.");
  return {
    success: false,
    error: "LinkedIn 분석은 Claude 에이전트가 처리합니다. /ownuun_linkedin 사용",
  };
}

/**
 * LinkedIn 스크린샷 분석 결과를 DB에 저장
 * @param {Object} analysisResult - analyzeLinkedInScreenshot 결과
 * @param {string} screenshotUrl - 저장된 스크린샷 URL
 * @param {string} postUrl - LinkedIn 포스트 URL
 * @returns {Promise<Object>}
 */
export async function saveLinkedInContent(analysisResult, screenshotUrl, postUrl) {
  if (!analysisResult.success) {
    throw new Error(analysisResult.error || "Analysis failed");
  }

  const data = analysisResult.data;

  // platform_id 생성 (URL에서 추출 또는 타임스탬프)
  let platformId;
  if (postUrl) {
    const urlMatch = postUrl.match(/activity-(\d+)/);
    platformId = urlMatch ? urlMatch[1] : `linkedin_${Date.now()}`;
  } else {
    platformId = `linkedin_${Date.now()}`;
  }

  const item = {
    platform: "linkedin",
    platform_id: platformId,
    title: null, // LinkedIn은 제목 없음
    description: data.content?.substring(0, 500) || null,
    content_text: data.content || null,
    url: postUrl || `https://linkedin.com/feed/update/${platformId}`,
    author_name: data.authorName || null,
    author_url: null, // 스크린샷에서는 URL 추출 어려움
    author_avatar: null, // 스크린샷에서는 이미지 URL 추출 불가
    author_title: data.authorTitle || null,
    thumbnail_url: null,
    screenshot_url: screenshotUrl,
    media_urls: data.hasMedia ? [] : [], // 실제 URL 없음
    published_at: data.publishedAt ? parseRelativeTime(data.publishedAt) : null,
    status: "pending",
    raw_data: {
      likeCount: data.likeCount || 0,
      reactionCount: data.reactionCount || 0,
      commentCount: data.commentCount || 0,
      repostCount: data.repostCount || 0,
      publishedAtRelative: data.publishedAt,
      hasMedia: data.hasMedia,
      mediaDescription: data.mediaDescription,
      authorAvatarDescription: data.authorAvatarDescription,
      analyzedAt: new Date().toISOString(),
    },
  };

  const { data: savedData, error } = await upsertCrawledContent([item]);

  if (error) {
    throw error;
  }

  logCrawl("linkedin", `Saved LinkedIn content: ${platformId}`);
  return { success: true, data: savedData?.[0] || item };
}

/**
 * LinkedIn 스크린샷 분석 및 저장 통합 함수
 * @param {string} imageUrl - 분석할 스크린샷 URL
 * @param {string} screenshotUrl - 저장된 스크린샷 URL (public 경로)
 * @param {string} postUrl - LinkedIn 포스트 URL (optional)
 */
export async function processLinkedInScreenshot(imageUrl, screenshotUrl, postUrl = null) {
  logCrawl("linkedin", "Starting LinkedIn screenshot processing");

  try {
    // 1. Vision API로 분석
    const analysisResult = await analyzeLinkedInScreenshot(imageUrl, postUrl);

    if (!analysisResult.success) {
      return analysisResult;
    }

    // 2. DB에 저장
    const saveResult = await saveLinkedInContent(
      analysisResult,
      screenshotUrl,
      postUrl
    );

    return {
      success: true,
      analysis: analysisResult.data,
      saved: saveResult.data,
    };
  } catch (error) {
    logCrawl("linkedin", `Processing error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
