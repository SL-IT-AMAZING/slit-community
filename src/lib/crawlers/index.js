import { getSupabaseAdmin } from "../supabase/admin.js";
import { extractAndUpdateContent } from "./content-extractor.js";

/**
 * 크롤링된 콘텐츠 upsert (중복 자동 처리)
 * @param {Array} items - 크롤링된 콘텐츠 배열
 * @param {Object} options - 옵션
 * @param {boolean} options.autoExtract - 자동 본문 추출 여부 (기본: true)
 * @returns {Promise<{data, error}>}
 */
export async function upsertCrawledContent(items, { autoExtract = true } = {}) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("crawled_content")
    .upsert(items, {
      onConflict: "platform,platform_id",
      ignoreDuplicates: true,
    })
    .select();

  if (error) {
    console.error("Error upserting crawled content:", error);
  }

  // 저장 성공 후 자동 본문 추출
  if (autoExtract && data?.length > 0) {
    const ids = data.map((d) => d.id);
    logCrawl("extractor", `Auto-extracting ${ids.length} items...`);
    try {
      const results = await extractAndUpdateContent(ids);
      const succeeded = results.filter((r) => r.success).length;
      logCrawl("extractor", `Extracted ${succeeded}/${ids.length} items`);
    } catch (e) {
      logCrawl("extractor", `Auto-extract failed: ${e.message}`);
    }
  }

  return { data, error };
}

/**
 * 플랫폼별 기존 ID 조회 (중복 체크용)
 * @param {string} platform - 플랫폼 이름
 * @param {Array<string>} platformIds - 플랫폼 ID 배열
 * @returns {Promise<Set<string>>}
 */
export async function getExistingPlatformIds(platform, platformIds) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("crawled_content")
    .select("platform_id")
    .eq("platform", platform)
    .in("platform_id", platformIds);

  if (error) {
    console.error("Error fetching existing IDs:", error);
    return new Set();
  }

  return new Set(data.map((item) => item.platform_id));
}

/**
 * 크롤링 로그 출력
 * @param {string} platform - 플랫폼 이름
 * @param {string} message - 로그 메시지
 */
export function logCrawl(platform, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${platform.toUpperCase()}] ${message}`);
}
