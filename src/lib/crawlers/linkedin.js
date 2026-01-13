import { upsertCrawledContent, logCrawl } from "./index.js";
import { analyzeImage } from "./llm.js";

/**
 * LinkedIn 스크린샷 Vision 분석 크롤러
 * 스크린샷 이미지를 업로드하면 Gemini Vision API로 분석하여 콘텐츠 추출
 */

const VISION_PROMPT = `이 LinkedIn 포스트 스크린샷을 분석해주세요. 다음 정보를 JSON 형식으로 추출해주세요:

{
  "authorName": "작성자 이름",
  "authorTitle": "작성자 직함/소속",
  "authorAvatarDescription": "프로필 사진 설명 (이미지이므로 URL 없음)",
  "content": "포스트 본문 전체 텍스트",
  "publishedAt": "게시 시간 (예: '2시간 전', '3일 전' 등 표시된 그대로)",
  "likeCount": 숫자 (좋아요 수, 없으면 0),
  "reactionCount": 숫자 (반응 수/파감수, 없으면 0),
  "commentCount": 숫자 (댓글 수, 없으면 0),
  "repostCount": 숫자 (리포스트 수, 없으면 0),
  "hasMedia": boolean (이미지/동영상 포함 여부),
  "mediaDescription": "첨부된 미디어 설명 (없으면 null)"
}

중요:
- 반드시 유효한 JSON만 출력해주세요
- 숫자는 문자열이 아닌 숫자로 반환해주세요
- 없는 정보는 null 또는 0으로 표시해주세요
- 본문 내용은 줄바꿈을 \\n으로 표시해주세요`;

/**
 * LinkedIn 스크린샷을 Vision API로 분석
 * @param {string} imageUrl - 스크린샷 이미지 URL
 * @param {string} postUrl - LinkedIn 포스트 URL (optional)
 * @returns {Promise<Object>} 분석 결과
 */
export async function analyzeLinkedInScreenshot(imageUrl, postUrl = null) {
  logCrawl("linkedin", `Analyzing screenshot: ${imageUrl.substring(0, 50)}...`);

  try {
    const resultText = await analyzeImage(imageUrl, VISION_PROMPT);

    if (!resultText) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // JSON 파싱 시도
    let parsedResult;
    try {
      // JSON 블록 추출 (마크다운 코드 블록 처리)
      const jsonMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                        resultText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : resultText;
      parsedResult = JSON.parse(jsonStr);
    } catch {
      logCrawl("linkedin", "Failed to parse JSON, using raw result");
      parsedResult = { content: resultText, parseError: true };
    }

    return {
      success: true,
      data: parsedResult,
      postUrl,
    };
  } catch (error) {
    logCrawl("linkedin", `Vision analysis error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
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
    published_at: null, // 상대 시간은 그대로 raw_data에 저장
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
