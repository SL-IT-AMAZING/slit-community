/**
 * 크롤링 콘텐츠 처리 스크립트
 *
 * 크롤링된 콘텐츠를 처리하고 발행합니다.
 *
 * 사용법:
 * node scripts/crawl-process.js
 *
 * 환경 변수:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - GEMINI_API_KEY
 */

import { config } from "dotenv";
import { dirname, resolve, join } from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import readline from "readline";
import { parseRelativeTime } from "../src/lib/crawlers/llm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Gemini AI 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 사용자 입력 받기
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

/**
 * 번호 입력 파싱 (예: "1,3,5" 또는 "1-3")
 */
function parseSelection(input, maxNum) {
  if (input.toLowerCase() === "all") {
    return Array.from({ length: maxNum }, (_, i) => i + 1);
  }
  if (input.toLowerCase() === "skip") {
    return [];
  }

  const selected = new Set();
  const parts = input.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let i = start; i <= end && i <= maxNum; i++) {
        selected.add(i);
      }
    } else {
      const num = Number(part);
      if (num >= 1 && num <= maxNum) {
        selected.add(num);
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * SNS 콘텐츠 한줄 요약 생성
 */
async function generateSummary(content) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const prompt = `다음 SNS 게시물을 한 줄로 요약해주세요. 핵심 내용만 간결하게 추출하세요.

게시물:
${content}

한 줄 요약:`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();
    return summary;
  } catch (error) {
    console.error("요약 생성 실패:", error.message);
    return null;
  }
}

/**
 * @deprecated 슬래시 커맨드(/ownuun_x, /ownuun_threads)로 대체됨
 * 스크린샷 분석 (Gemini Vision API) - 더 이상 메인 워크플로우에서 사용하지 않음
 */
async function analyzeScreenshot(screenshotPath, platform) {
  try {
    const fullPath = join(__dirname, "..", "public", screenshotPath);
    if (!existsSync(fullPath)) {
      console.error(`스크린샷 파일 없음: ${fullPath}`);
      return null;
    }

    const buffer = readFileSync(fullPath);
    const base64 = buffer.toString("base64");
    const mimeType = screenshotPath.endsWith(".png") ? "image/png" : "image/jpeg";

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = platform === "threads"
      ? `이 Threads 포스트 스크린샷을 분석해서 다음 정보를 JSON으로 추출해주세요.

다음 형식으로 JSON만 출력하세요:
{
  "authorName": "작성자 이름 (@ 없이)",
  "content": "포스트 본문 전체 (줄바꿈은 \\n으로)",
  "publishedAt": "게시 시간 (예: 2h, 1d, Jan 14 등 화면에 보이는 그대로)",
  "metrics": {
    "likes": 좋아요 수 (숫자만, 없으면 0),
    "reposts": 리포스트 수 (숫자만, 없으면 0),
    "views": 조회수 (숫자만, 없으면 0)
  }
}

주의: K는 1000, M은 1000000으로 변환. JSON만 출력.`
      : `이 X (Twitter) 포스트 스크린샷을 분석해서 다음 정보를 JSON으로 추출해주세요.

다음 형식으로 JSON만 출력하세요:
{
  "authorName": "작성자 표시 이름",
  "authorHandle": "@handle",
  "content": "트윗 본문 전체 (줄바꿈은 \\n으로)",
  "publishedAt": "게시 시간 (예: 2h, 1d, Jan 14 등 화면에 보이는 그대로)",
  "metrics": {
    "likes": 좋아요 수,
    "retweets": 리트윗 수,
    "views": 조회수
  }
}

주의: K는 1000, M은 1000000으로 변환. JSON만 출력.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64 } },
    ]);

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // 상대 시간을 절대 시간으로 변환
      if (parsed.publishedAt) {
        parsed.publishedAt = parseRelativeTime(parsed.publishedAt);
      }
      return parsed;
    }
    return null;
  } catch (error) {
    console.error(`스크린샷 분석 실패: ${error.message}`);
    return null;
  }
}

/**
 * 0단계: 스크린샷 분석 대기 상태 확인
 * (실제 분석은 Claude Code 슬래시 커맨드로 수행)
 */
async function checkPendingAnalysis() {
  console.log("\n[0단계] 분석 대기 중인 스크린샷 확인...");

  const { data: pendingContent, error } = await supabase
    .from("crawled_content")
    .select("id, platform, platform_id, screenshot_url, author_name, crawled_at")
    .in("platform", ["threads", "x"])
    .eq("status", "pending_analysis")
    .order("platform")
    .order("crawled_at", { ascending: false });

  if (error) {
    console.error("분석 대기 조회 실패:", error.message);
    return [];
  }

  if (!pendingContent || pendingContent.length === 0) {
    console.log("분석 대기 중인 스크린샷이 없습니다.");
    return [];
  }

  // 플랫폼별 그룹화
  const grouped = {
    threads: pendingContent.filter((item) => item.platform === "threads"),
    x: pendingContent.filter((item) => item.platform === "x"),
  };

  console.log(`\n=== 분석 대기 중인 스크린샷 ===`);

  if (grouped.threads.length > 0) {
    console.log(`\nThreads: ${grouped.threads.length}건`);
    grouped.threads.forEach((item) => {
      console.log(`  - ${item.platform_id} (${item.screenshot_url})`);
    });
    console.log(`  → /ownuun_threads 명령어로 분석하세요`);
  }

  if (grouped.x.length > 0) {
    console.log(`\nX: ${grouped.x.length}건`);
    grouped.x.forEach((item) => {
      console.log(`  - ${item.platform_id} (${item.screenshot_url})`);
    });
    console.log(`  → /ownuun_x 명령어로 분석하세요`);
  }

  console.log(`\n총 ${pendingContent.length}건 분석 대기 중`);
  return pendingContent;
}

/**
 * 1단계: Threads/X/Reddit 백그라운드 처리
 */
async function processSNSContent() {
  console.log("\n[1단계] SNS 콘텐츠 처리 시작...");

  const { data: snsContent, error } = await supabase
    .from("crawled_content")
    .select("*")
    .in("platform", ["threads", "x", "reddit"])
    .eq("status", "pending");

  if (error) {
    console.error("SNS 콘텐츠 조회 실패:", error.message);
    return [];
  }

  if (!snsContent || snsContent.length === 0) {
    console.log("처리할 SNS 콘텐츠가 없습니다.");
    return [];
  }

  console.log(`처리할 SNS 콘텐츠: ${snsContent.length}건`);

  const results = [];
  for (const item of snsContent) {
    try {
      // 한줄 요약 생성
      const summary = await generateSummary(
        item.translated_content || item.content || item.description || ""
      );

      if (summary) {
        // digest_result 업데이트
        const digestResult = item.digest_result || {};
        digestResult.summary_oneline = summary;

        await supabase
          .from("crawled_content")
          .update({
            digest_result: digestResult,
            status: "completed",
          })
          .eq("id", item.id);

        console.log(
          `✓ ${item.platform} - @${item.author_name}: ${summary.substring(0, 50)}...`
        );
        results.push({ ...item, digest_result: digestResult });
      }
    } catch (error) {
      console.error(`${item.platform} 처리 실패 (ID: ${item.id}):`, error.message);
    }
  }

  console.log(`SNS 콘텐츠 처리 완료: ${results.length}건`);
  return results;
}

/**
 * 2단계: YouTube 목록 표시 및 처리
 */
async function processYouTubeContent() {
  console.log("\n[2단계] YouTube 콘텐츠 조회...");

  const { data: youtubeContent, error } = await supabase
    .from("crawled_content")
    .select("id, title, translated_title, url, author_name")
    .eq("platform", "youtube")
    .eq("status", "pending")
    .order("crawled_at", { ascending: false });

  if (error) {
    console.error("YouTube 콘텐츠 조회 실패:", error.message);
    return [];
  }

  if (!youtubeContent || youtubeContent.length === 0) {
    console.log("처리할 YouTube 콘텐츠가 없습니다.");
    return [];
  }

  console.log(`\n=== YouTube 크롤링 목록 (${youtubeContent.length}건) ===`);
  youtubeContent.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.translated_title || item.title} - ${item.author_name}`
    );
    console.log(`   ${item.url}\n`);
  });

  const selection = await askQuestion(
    "처리할 번호를 입력하세요 (예: 1,3,5 또는 1-3 또는 all, skip): "
  );
  const selectedIndices = parseSelection(selection, youtubeContent.length);

  if (selectedIndices.length === 0) {
    console.log("YouTube 처리를 건너뜁니다.");
    return [];
  }

  const selectedVideos = selectedIndices.map((i) => youtubeContent[i - 1]);
  console.log(`\n선택된 영상: ${selectedVideos.length}건`);
  console.log("YouTube digest 처리는 별도로 /kiev-youtube-digest 스킬을 사용하세요.");

  return selectedVideos;
}

/**
 * 3단계: LinkedIn 처리
 */
async function processLinkedInContent() {
  console.log("\n[3단계] LinkedIn 콘텐츠 처리...");

  const answer = await askQuestion(
    '\nLinkedIn 스크린샷 있으면 첨부해주세요 (없으면 "패스" 입력): '
  );

  if (answer.toLowerCase() === "패스" || answer.toLowerCase() === "pass") {
    console.log("LinkedIn 처리를 건너뜁니다.");
    return null;
  }

  console.log("LinkedIn Vision API 처리는 별도 구현이 필요합니다.");
  return null;
}

/**
 * 5단계: 자동 발행 (YouTube, LinkedIn, GitHub)
 */
async function autoPublish() {
  console.log("\n[5단계] 자동 발행 시작...");

  const { data: autoContent, error } = await supabase
    .from("crawled_content")
    .select("*")
    .in("platform", ["youtube", "linkedin", "github"])
    .eq("status", "completed");

  if (error) {
    console.error("자동 발행 대상 조회 실패:", error.message);
    return { youtube: 0, linkedin: 0, github: 0 };
  }

  if (!autoContent || autoContent.length === 0) {
    console.log("자동 발행할 콘텐츠가 없습니다.");
    return { youtube: 0, linkedin: 0, github: 0 };
  }

  const counts = { youtube: 0, linkedin: 0, github: 0 };

  for (const item of autoContent) {
    try {
      // content 테이블로 이동
      const { error: insertError } = await supabase.from("content").insert({
        title: item.translated_title || item.title,
        description: item.translated_content || item.description,
        url: item.url,
        source: item.platform,
        author: item.author_name,
        thumbnail_url: item.thumbnail_url,
        published_at: item.published_at,
        metadata: {
          digest: item.digest_result,
          original_title: item.title,
          platform_id: item.platform_id,
        },
      });

      if (insertError) {
        console.error(`발행 실패 (${item.platform}):`, insertError.message);
        continue;
      }

      // crawled_content에서 삭제
      await supabase.from("crawled_content").delete().eq("id", item.id);

      counts[item.platform]++;
      console.log(`✓ ${item.platform}: ${item.title || item.description?.substring(0, 50)}`);
    } catch (error) {
      console.error(`발행 실패 (${item.platform}):`, error.message);
    }
  }

  return counts;
}

/**
 * 5단계: 선택 발행 (Threads, X, Reddit)
 */
async function selectivePublish() {
  console.log("\n[5단계] 선택 발행 시작...");

  const { data: snsContent, error } = await supabase
    .from("crawled_content")
    .select("*")
    .in("platform", ["threads", "x", "reddit"])
    .eq("status", "completed")
    .order("platform", { ascending: true })
    .order("crawled_at", { ascending: false });

  if (error) {
    console.error("선택 발행 대상 조회 실패:", error.message);
    return { threads: 0, x: 0, reddit: 0 };
  }

  if (!snsContent || snsContent.length === 0) {
    console.log("선택 발행할 콘텐츠가 없습니다.");
    return { threads: 0, x: 0, reddit: 0 };
  }

  // 플랫폼별 그룹화
  const grouped = {
    threads: snsContent.filter((item) => item.platform === "threads"),
    x: snsContent.filter((item) => item.platform === "x"),
    reddit: snsContent.filter((item) => item.platform === "reddit"),
  };

  let index = 1;
  const allItems = [];

  // Threads 표시
  if (grouped.threads.length > 0) {
    console.log(`\n=== Threads (${grouped.threads.length}건) ===`);
    grouped.threads.forEach((item) => {
      const summary =
        item.digest_result?.summary_oneline ||
        item.translated_content?.substring(0, 50) ||
        item.content?.substring(0, 50) ||
        "";
      console.log(`${index}. @${item.author_name} - ${summary}`);
      allItems.push(item);
      index++;
    });
  }

  // X 표시
  if (grouped.x.length > 0) {
    console.log(`\n=== X (${grouped.x.length}건) ===`);
    grouped.x.forEach((item) => {
      const summary =
        item.digest_result?.summary_oneline ||
        item.translated_content?.substring(0, 50) ||
        item.content?.substring(0, 50) ||
        "";
      console.log(`${index}. @${item.author_name} - ${summary}`);
      allItems.push(item);
      index++;
    });
  }

  // Reddit 표시
  if (grouped.reddit.length > 0) {
    console.log(`\n=== Reddit (${grouped.reddit.length}건) ===`);
    grouped.reddit.forEach((item) => {
      const summary =
        item.digest_result?.summary_oneline ||
        item.translated_content?.substring(0, 50) ||
        item.content?.substring(0, 50) ||
        "";
      console.log(`${index}. u/${item.author_name} - ${summary}`);
      allItems.push(item);
      index++;
    });
  }

  const selection = await askQuestion(
    "\n게시할 번호를 선택하세요 (예: 1,3,5 또는 all): "
  );
  const selectedIndices = parseSelection(selection, allItems.length);

  if (selectedIndices.length === 0) {
    console.log("선택 발행을 건너뜁니다.");
    return { threads: 0, x: 0, reddit: 0 };
  }

  const counts = { threads: 0, x: 0, reddit: 0 };

  for (const i of selectedIndices) {
    const item = allItems[i - 1];
    try {
      // content 테이블로 이동
      const { error: insertError } = await supabase.from("content").insert({
        title: item.translated_title || item.title,
        description: item.translated_content || item.description,
        url: item.url,
        source: item.platform,
        author: item.author_name,
        thumbnail_url: item.thumbnail_url,
        published_at: item.published_at,
        metadata: {
          digest: item.digest_result,
          original_title: item.title,
          platform_id: item.platform_id,
        },
      });

      if (insertError) {
        console.error(`발행 실패 (${item.platform}):`, insertError.message);
        continue;
      }

      // crawled_content에서 삭제
      await supabase.from("crawled_content").delete().eq("id", item.id);

      counts[item.platform]++;
      console.log(
        `✓ ${item.platform}: @${item.author_name} - ${item.digest_result?.summary_oneline?.substring(0, 50)}`
      );
    } catch (error) {
      console.error(`발행 실패 (${item.platform}):`, error.message);
    }
  }

  return counts;
}

/**
 * 메인 함수
 */
async function main() {
  console.log("=== 크롤링 콘텐츠 처리 시작 ===\n");

  try {
    // 0단계: 분석 대기 중인 스크린샷 확인 (슬래시 커맨드로 분석)
    await checkPendingAnalysis();

    // 1단계: SNS 콘텐츠 처리 (백그라운드)
    const snsResults = await processSNSContent();

    // 2단계: YouTube 목록 표시 및 선택
    const youtubeVideos = await processYouTubeContent();

    // 3단계: LinkedIn 처리
    const linkedinResult = await processLinkedInContent();

    // 5단계: 자동 발행
    const autoCounts = await autoPublish();

    // 5단계: 선택 발행
    const selectiveCounts = await selectivePublish();

    // 결과 요약
    console.log("\n=== 발행 완료 ===");
    console.log(
      `자동 발행: YouTube ${autoCounts.youtube}건, GitHub ${autoCounts.github}건, LinkedIn ${autoCounts.linkedin}건`
    );
    console.log(
      `선택 발행: Threads ${selectiveCounts.threads}건, X ${selectiveCounts.x}건, Reddit ${selectiveCounts.reddit}건`
    );

    const totalCount =
      Object.values(autoCounts).reduce((sum, count) => sum + count, 0) +
      Object.values(selectiveCounts).reduce((sum, count) => sum + count, 0);

    console.log(`\n총 ${totalCount}건이 content 테이블로 발행되었습니다.`);
  } catch (error) {
    console.error("처리 중 오류 발생:", error);
    process.exit(1);
  }
}

// 실행
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
