import { getSupabaseAdmin } from "../supabase/admin.js";
import { extractAndUpdateContent } from "./content-extractor.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_BASE_DIR = path.join(__dirname, "../../../public/screenshots");

/**
 * 플랫폼별 타임스탬프 폴더 경로 생성
 * @param {string} platform - 플랫폼 이름 (github, x, threads 등)
 * @param {string} [timestamp] - 타임스탬프 (없으면 현재 시간)
 * @returns {{dir: string, urlPrefix: string}} 디렉토리 경로와 URL prefix
 */
export function getScreenshotDir(platform, timestamp) {
  const ts = timestamp || new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
  const dir = path.join(SCREENSHOT_BASE_DIR, platform, ts);

  // 디렉토리 생성
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return {
    dir,
    urlPrefix: `/screenshots/${platform}/${ts}`,
  };
}

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
      ignoreDuplicates: false,  // 기존 레코드도 업데이트 (raw_data 포함)
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

const MAX_DAILY_HISTORY = 365; // 1년 제한

/**
 * 히스토리에 추가 (중복 날짜 덮어쓰기, 365일 제한)
 * @param {Array} history - 기존 히스토리 배열
 * @param {number} rank - 랭킹
 * @param {string} date - 날짜 (YYYY-MM-DD)
 * @returns {Array} 업데이트된 히스토리
 */
function addToHistory(history, rank, date) {
  const arr = [...(history || [])];
  const idx = arr.findIndex((h) => h.date === date);
  if (idx >= 0) {
    arr[idx].rank = rank;
  } else {
    arr.push({ rank, date });
  }
  // 365일 초과시 오래된 것 제거
  return arr.slice(-MAX_DAILY_HISTORY);
}

/**
 * 언어별 랭킹 병합 (daily도 히스토리로)
 * @param {Object} existing - 기존 언어별 랭킹
 * @param {Object} incoming - 새 언어별 랭킹 (예: { weekly: 5, daily: 2 })
 * @param {string} today - 오늘 날짜
 * @returns {Object} 병합된 언어별 랭킹
 */
function mergeLangRanking(existing, incoming, today) {
  const merged = { ...existing };

  for (const [period, rank] of Object.entries(incoming)) {
    if (period === "daily") {
      merged.daily_history = addToHistory(merged.daily_history, rank, today);
    } else if (period !== "daily_history") {
      merged[period] = rank;
    }
  }

  return merged;
}

/**
 * 랭킹 병합 함수
 * - 전체 트렌딩: ranking.weekly, ranking.monthly, ranking.daily_history[]
 * - 언어별 트렌딩: ranking.python.weekly, ranking.python.daily_history[]
 * @param {Object} existing - 기존 랭킹 객체
 * @param {Object} incoming - 새 랭킹 객체 (예: { daily: 5 } 또는 { python: { weekly: 3 } })
 * @returns {Object} 병합된 랭킹
 */
function mergeRanking(existing, incoming) {
  const merged = { ...existing };
  const today = new Date().toISOString().slice(0, 10);

  for (const [key, value] of Object.entries(incoming)) {
    if (key === "daily") {
      // 전체 daily는 히스토리에 추가
      merged.daily_history = addToHistory(merged.daily_history, value, today);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      // 언어별 랭킹 (예: { python: { weekly: 5, daily: 2 } })
      merged[key] = mergeLangRanking(merged[key] || {}, value, today);
    } else if (key !== "daily_history") {
      // weekly/monthly는 덮어쓰기
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * 랭킹 병합을 지원하는 upsert
 * - 동일 레포가 daily/weekly/monthly에 나와도 1개 레코드로 관리
 * - weekly/monthly: 덮어쓰기
 * - daily: daily_history 배열에 누적
 * @param {Array} items - 크롤링된 콘텐츠 배열 (ranking 필드 포함)
 * @param {Object} options - 옵션
 * @param {boolean} options.autoExtract - 자동 본문 추출 여부 (기본: false for github)
 * @returns {Promise<{data, error}>}
 */
export async function upsertWithRankingMerge(items, { autoExtract = false } = {}) {
  const supabase = getSupabaseAdmin();

  // 1. 기존 레코드 조회
  const platformIds = items.map((item) => item.platform_id);
  const platform = items[0]?.platform;

  const { data: existingRecords, error: fetchError } = await supabase
    .from("crawled_content")
    .select("platform_id, ranking, raw_data")
    .eq("platform", platform)
    .in("platform_id", platformIds);

  if (fetchError) {
    console.error("Error fetching existing records:", fetchError);
    return { data: null, error: fetchError };
  }

  // 기존 레코드를 Map으로 변환
  const existingMap = new Map(
    existingRecords?.map((r) => [r.platform_id, r]) || []
  );

  // 2. 랭킹 병합
  const mergedItems = items.map((item) => {
    const existing = existingMap.get(item.platform_id);
    if (existing) {
      // 기존 레코드가 있으면 랭킹 병합
      return {
        ...item,
        ranking: mergeRanking(existing.ranking || {}, item.ranking || {}),
        // raw_data도 병합 (stars, forks 등 최신 값으로 업데이트)
        raw_data: { ...existing.raw_data, ...item.raw_data },
      };
    }
    return item;
  });

  // 3. Upsert 실행 (ignoreDuplicates: false로 업데이트 허용)
  const { data, error } = await supabase
    .from("crawled_content")
    .upsert(mergedItems, {
      onConflict: "platform,platform_id",
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
    console.error("Error upserting with ranking merge:", error);
  }

  // 저장 성공 후 자동 본문 추출 (선택적)
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

// ============================================
// Trendshift 뱃지 관련 함수들
// ============================================

const TRENDSHIFT_BASE_URL = "https://trendshift.io";

/**
 * 뱃지 SVG에서 등수 파싱
 * @param {string} svgContent - SVG 문자열
 * @returns {number|null} 등수 또는 null
 */
function parseBadgeRank(svgContent) {
  // "#11 Repository Of The Day" → 11
  const match = svgContent.match(/#(\d+)\s+Repository/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Trendshift 뱃지 수집 필요 여부 판단
 * @param {Object} existingRawData - 기존 raw_data
 * @param {number} currentRank - 현재 GitHub 트렌딩 순위
 * @returns {boolean} 수집 필요 여부
 */
export function shouldFetchBadge(existingRawData, currentRank) {
  const badgeRank = existingRawData?.trendshift_badge_rank;

  // 1등 뱃지 이미 있으면 스킵 (최고 달성)
  if (badgeRank === 1) {
    return false;
  }

  // 뱃지 없음 (신규) → 수집
  if (!badgeRank) {
    return true;
  }

  // 현재 순위 < 저장된 뱃지 순위 → 더 좋은 뱃지 가능
  return currentRank < badgeRank;
}

/**
 * Trendshift에서 레포 검색 후 뱃지 정보 반환
 * @param {string} repoName - GitHub 레포 이름 (owner/repo)
 * @returns {Promise<{badgeUrl: string, badgeRank: number, trendshiftUrl: string}|null>}
 */
export async function fetchTrendshiftBadge(repoName) {
  try {
    // 1. Trendshift 검색 페이지에서 레포 찾기
    const searchUrl = `${TRENDSHIFT_BASE_URL}?q=${encodeURIComponent(repoName)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });

    if (!searchRes.ok) {
      logCrawl("trendshift", `Search failed for ${repoName}: ${searchRes.status}`);
      return null;
    }

    const html = await searchRes.text();

    // 2. 레포 ID 추출 (GitHub 링크에서 매칭되는 레포 카드 찾기)
    const repoIdMatch = html.match(
      new RegExp(`href="/repositories/(\\d+)"[^>]*>[\\s\\S]*?${repoName.replace("/", "/")}`, "i")
    );

    if (!repoIdMatch) {
      // 직접 URL 시도 (레포명으로 검색 실패시)
      logCrawl("trendshift", `Repo not found in search: ${repoName}`);
      return null;
    }

    const repoId = repoIdMatch[1];
    const badgeUrl = `${TRENDSHIFT_BASE_URL}/api/badge/repositories/${repoId}`;
    const trendshiftUrl = `${TRENDSHIFT_BASE_URL}/repositories/${repoId}`;

    // 3. 뱃지 SVG 가져와서 등수 파싱
    const badgeRes = await fetch(badgeUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!badgeRes.ok) {
      logCrawl("trendshift", `Badge fetch failed for ${repoName}: ${badgeRes.status}`);
      return { badgeUrl, badgeRank: null, trendshiftUrl };
    }

    const svgContent = await badgeRes.text();
    const badgeRank = parseBadgeRank(svgContent);

    logCrawl("trendshift", `Badge found for ${repoName}: rank #${badgeRank}`);

    return { badgeUrl, badgeRank, trendshiftUrl };
  } catch (error) {
    logCrawl("trendshift", `Error fetching badge for ${repoName}: ${error.message}`);
    return null;
  }
}

// ============================================
// 분석 상태 관리 함수들
// ============================================

/**
 * 분석 실패 시 상태 업데이트
 * @param {string} id - 레코드 ID
 * @param {string} errorMessage - 에러 메시지
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markAnalysisFailed(id, errorMessage) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("crawled_content")
    .update({
      status: "analysis_failed",
      raw_data: supabase.rpc ? undefined : { analysis_error: errorMessage, failed_at: new Date().toISOString() },
    })
    .eq("id", id);

  if (error) {
    logCrawl("analysis", `Failed to mark analysis_failed for ${id}: ${error.message}`);
    return { success: false, error: error.message };
  }

  logCrawl("analysis", `Marked as analysis_failed: ${id}`);
  return { success: true };
}

/**
 * 분석 실패한 레코드 재시도 대상 조회
 * @param {string} platform - 플랫폼 이름
 * @param {number} limit - 최대 개수
 * @returns {Promise<Array>}
 */
export async function getFailedAnalysisRecords(platform, limit = 10) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("platform", platform)
    .eq("status", "analysis_failed")
    .order("crawled_at", { ascending: false })
    .limit(limit);

  if (error) {
    logCrawl("analysis", `Failed to fetch analysis_failed records: ${error.message}`);
    return [];
  }

  return data || [];
}

/**
 * 분석 실패 → pending_analysis 로 되돌리기 (재시도용)
 * @param {Array<string>} ids - 레코드 ID 배열
 * @returns {Promise<{success: number, failed: number}>}
 */
export async function retryFailedAnalysis(ids) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("crawled_content")
    .update({ status: "pending_analysis" })
    .in("id", ids)
    .select();

  if (error) {
    logCrawl("analysis", `Failed to retry analysis: ${error.message}`);
    return { success: 0, failed: ids.length };
  }

  logCrawl("analysis", `Retrying ${data?.length || 0} records for analysis`);
  return { success: data?.length || 0, failed: ids.length - (data?.length || 0) };
}
