import { logCrawl } from "./index.js";

/**
 * 한국어 포함 여부 체크
 */
function hasKorean(text) {
  return /[\uAC00-\uD7AF]/.test(text);
}

/**
 * Google Translate 무료 API로 번역
 * @param {string} text - 번역할 텍스트
 * @param {string} targetLang - 대상 언어 (기본: ko)
 * @param {string} sourceLang - 소스 언어 (기본: auto)
 * @returns {Promise<string|null>}
 */
export async function translateText(
  text,
  targetLang = "ko",
  sourceLang = "auto",
) {
  // 유효성 검사
  if (!text || text.trim().length < 10) return null;

  // 이미 한국어가 대부분인 경우 스킵
  if (targetLang === "ko" && hasKorean(text)) {
    const koreanRatio =
      (text.match(/[\uAC00-\uD7AF]/g) || []).length / text.length;
    if (koreanRatio > 0.3) return null; // 30% 이상 한국어면 스킵
  }

  try {
    // Google Translate 무료 엔드포인트
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", sourceLang);
    url.searchParams.set("tl", targetLang);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text.slice(0, 5000)); // 최대 5000자

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // 응답 파싱: [[["번역된 텍스트","원문",null,null,10],...],null,"en",...]
    if (!data || !data[0]) return null;

    const translatedParts = data[0]
      .filter((part) => part && part[0])
      .map((part) => part[0]);

    const translated = translatedParts.join("");

    if (!translated || translated === text) return null;

    return translated;
  } catch (error) {
    logCrawl("translate", `Error: ${error.message}`);
    return null;
  }
}

/**
 * 제목 번역 (짧은 텍스트용)
 */
export async function translateTitle(title) {
  if (!title || title.length < 5) return null;
  return translateText(title, "ko", "auto");
}

/**
 * 본문 번역 (긴 텍스트용)
 */
export async function translateContent(content) {
  if (!content || content.length < 20) return null;
  return translateText(content, "ko", "auto");
}

/**
 * 영어로 번역
 */
export async function translateToEnglish(text) {
  if (!text || text.length < 10) return null;

  if (!hasKorean(text)) {
    return text;
  }

  return translateText(text, "en", "ko");
}

/**
 * 한국어로 번역
 */
export async function translateToKorean(text) {
  if (!text || text.length < 10) return null;

  if (hasKorean(text)) {
    const koreanRatio =
      (text.match(/[\uAC00-\uD7AF]/g) || []).length / text.length;
    if (koreanRatio > 0.3) return text;
  }

  return translateText(text, "ko", "en");
}

/**
 * 양방향 번역 (원문 언어 감지 후 영어/한국어 둘 다 반환)
 * @returns {Promise<{en: string, ko: string}>}
 */
export async function translateBoth(text) {
  if (!text || text.length < 10) return { en: null, ko: null };

  const isKorean =
    hasKorean(text) &&
    (text.match(/[\uAC00-\uD7AF]/g) || []).length / text.length > 0.3;

  if (isKorean) {
    const translated = await translateText(text, "en", "ko");
    return { en: translated, ko: text };
  } else {
    const translated = await translateText(text, "ko", "en");
    return { en: text, ko: translated };
  }
}
