/**
 * Reddit 콘텐츠 분석 스크립트
 * pending_analysis 상태의 Reddit 콘텐츠를 분석하여 DB 업데이트
 *
 * 사용법: node scripts/analyze-reddit.mjs
 *
 * 환경변수:
 * - GEMINI_API_KEY: Gemini API 키
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase 서비스 키
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// 설정
const MAX_RETRIES = 3;
const BASE_DELAY = 5000; // 5초 기본 딜레이
const RATE_LIMIT_DELAY = 60000; // 429 에러시 60초 대기

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Gemini 클라이언트
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 지연 함수
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재시도 로직이 포함된 API 호출
 */
async function withRetry(fn, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRateLimit =
        error.message?.includes("429") || error.message?.includes("quota");

      if (isRateLimit && attempt < maxRetries) {
        console.log(
          `  ⚠️ Rate limit hit. Waiting ${RATE_LIMIT_DELAY / 1000}s before retry ${attempt + 1}/${maxRetries}...`,
        );
        await sleep(RATE_LIMIT_DELAY);
      } else if (attempt < maxRetries) {
        const delay = BASE_DELAY * attempt;
        console.log(
          `  ⚠️ Error: ${error.message}. Retrying in ${delay / 1000}s (${attempt + 1}/${maxRetries})...`,
        );
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * 이미지를 base64로 인코딩
 */
function imageToBase64(imagePath) {
  let absolutePath = imagePath;

  if (imagePath.startsWith("/screenshots")) {
    absolutePath = path.join(process.cwd(), "public", imagePath);
  } else if (!imagePath.startsWith("/")) {
    absolutePath = path.join(process.cwd(), "public", imagePath);
  }

  if (!fs.existsSync(absolutePath)) {
    console.log(`Image not found: ${absolutePath}`);
    return null;
  }

  const imageData = fs.readFileSync(absolutePath);
  return imageData.toString("base64");
}

/**
 * Gemini Vision으로 스크린샷에서 정보 추출
 */
async function extractFromScreenshot(screenshotPath) {
  const base64Image = imageToBase64(screenshotPath);
  if (!base64Image) return null;

  return withRetry(async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image,
        },
      },
      `Analyze this Reddit post screenshot and extract information in JSON format:

{
  "title": "Post title",
  "content": "Post body text (if any)",
  "author": "u/username",
  "subreddit": "r/subreddit_name",
  "published_at": "relative time shown (e.g., 2h, 1d, etc.)",
  "metrics": {
    "upvotes": number (convert K to thousands, M to millions),
    "comments": number
  }
}

Return ONLY valid JSON, no markdown.`,
    ]);

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No JSON found in response");
  }).catch((error) => {
    console.error("Vision extraction error:", error.message);
    return null;
  });
}

/**
 * Gemini로 콘텐츠 분석
 */
async function analyzeContent(title, content, subreddit) {
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Analyze this Reddit post and provide a structured analysis.

Subreddit: ${subreddit || "Unknown"}
Title: ${title || "Unknown"}
Content: ${content || "(no body text)"}

Respond in JSON format:
{
  "summary_oneline": "한 줄 요약 (한국어, 40자 이내)",
  "content_ko": "한국어 번역 (원문이 한국어면 그대로)",
  "content_en": "영어 버전 (원문이 영어면 그대로)",
  "categories": ["array from: llm, ai-tools, open-source, research-papers, industry-trends, ai-basics, claude-code, image-generation, ai-monetization"],
  "recommendScore": 1-10 (integer),
  "recommendReason": "추천 이유 (한국어)"
}

Return ONLY valid JSON, no markdown.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    const jsonText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(jsonText);
  }).catch((error) => {
    console.error("Analysis error:", error.message);
    return null;
  });
}

/**
 * 상대 시간을 ISO 형식으로 변환
 */
function parseRelativeTime(relativeTime) {
  if (!relativeTime) return new Date().toISOString();

  const now = new Date();
  const str = relativeTime.toString().toLowerCase().trim();
  const timeMatch = str.match(/^(\d+)\s*(s|sec|m|min|h|hr|d|w|mo|y)/i);

  if (timeMatch) {
    const value = parseInt(timeMatch[1]);
    const unit = timeMatch[2].toLowerCase();
    switch (unit) {
      case "s":
      case "sec":
        now.setSeconds(now.getSeconds() - value);
        break;
      case "m":
      case "min":
        now.setMinutes(now.getMinutes() - value);
        break;
      case "h":
      case "hr":
        now.setHours(now.getHours() - value);
        break;
      case "d":
        now.setDate(now.getDate() - value);
        break;
      case "w":
        now.setDate(now.getDate() - value * 7);
        break;
      case "mo":
        now.setMonth(now.getMonth() - value);
        break;
      case "y":
        now.setFullYear(now.getFullYear() - value);
        break;
    }
  }
  return now.toISOString();
}

/**
 * 메인 분석 함수
 */
async function analyzeRedditContent() {
  console.log("=== Reddit Content Analysis Started ===\n");

  // pending_analysis 상태의 Reddit 콘텐츠 조회
  const { data: records, error } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("platform", "reddit")
    .eq("status", "pending_analysis")
    .order("crawled_at", { ascending: false });

  if (error) {
    console.error("DB query error:", error);
    return;
  }

  console.log(`Found ${records?.length || 0} records to analyze\n`);

  if (!records || records.length === 0) {
    console.log("No pending_analysis records found for Reddit");
    return { analyzed: 0, avgScore: 0 };
  }

  let analyzed = 0;
  let totalScore = 0;
  const results = [];

  for (const record of records) {
    console.log(`\n--- Processing: ${record.platform_id} ---`);
    console.log(`URL: ${record.url}`);

    // 1. raw_data에서 정보 추출 또는 스크린샷 분석
    let title = record.title || record.raw_data?.title || "";
    let content = record.raw_data?.content || record.raw_data?.selftext || "";
    let subreddit = record.raw_data?.subreddit || "";
    let author = record.raw_data?.author || "";
    let metrics = record.raw_data?.metrics || {};
    let publishedAt = record.raw_data?.published_at || null;

    // 스크린샷에서 추가 정보 추출 시도
    if ((!title || !subreddit) && record.screenshot_url) {
      console.log("Extracting from screenshot...");
      const extracted = await extractFromScreenshot(record.screenshot_url);
      if (extracted) {
        title = title || extracted.title;
        content = content || extracted.content;
        subreddit = subreddit || extracted.subreddit;
        author = author || extracted.author;
        metrics = { ...metrics, ...extracted.metrics };
        if (extracted.published_at) {
          publishedAt = parseRelativeTime(extracted.published_at);
        }
      }
    }

    if (!title && !content) {
      console.log("Could not extract content, skipping...");
      continue;
    }

    console.log(`Title: ${title?.substring(0, 60)}...`);
    console.log(`Subreddit: ${subreddit}`);

    // 2. Gemini로 분석
    console.log("Analyzing with Gemini...");
    const analysis = await analyzeContent(title, content, subreddit);

    if (!analysis) {
      console.log("Analysis failed, skipping...");
      continue;
    }

    console.log(`Summary: ${analysis.summary_oneline}`);
    console.log(`Score: ${analysis.recommendScore}/10`);
    console.log(`Categories: ${analysis.categories?.join(", ")}`);

    // 3. DB 업데이트
    const updateData = {
      title: `${subreddit || "r/Unknown"} - ${analysis.summary_oneline}`,
      content_text: analysis.content_en,
      translated_content: analysis.content_ko,
      published_at: publishedAt,
      digest_result: {
        original_title: title,
        summary_oneline: analysis.summary_oneline,
        categories: analysis.categories,
        metrics: metrics,
        subreddit: subreddit,
        author_name: author,
        recommendScore: analysis.recommendScore,
        recommendReason: analysis.recommendReason,
        processedAt: new Date().toISOString(),
      },
      status: "pending",
    };

    const { error: updateError } = await supabase
      .from("crawled_content")
      .update(updateData)
      .eq("id", record.id);

    if (updateError) {
      console.error(`Update error for ${record.id}:`, updateError);
      continue;
    }

    console.log("DB updated successfully");

    analyzed++;
    totalScore += analysis.recommendScore;
    results.push({
      id: record.id,
      platform_id: record.platform_id,
      subreddit: subreddit,
      title: title?.substring(0, 50),
      summary: analysis.summary_oneline,
      score: analysis.recommendScore,
      categories: analysis.categories,
    });

    // API 레이트 리밋 방지
    await sleep(BASE_DELAY);
  }

  const avgScore = analyzed > 0 ? (totalScore / analyzed).toFixed(2) : 0;

  console.log("\n=== Analysis Complete ===");
  console.log(`Analyzed: ${analyzed} records`);
  console.log(`Average Score: ${avgScore}/10`);

  console.log("\n=== Results Summary ===");
  results.forEach((r, i) => {
    console.log(`${i + 1}. [${r.score}/10] ${r.subreddit}: ${r.summary}`);
  });

  return { analyzed, avgScore: parseFloat(avgScore), results };
}

// 실행
analyzeRedditContent()
  .then((result) => {
    console.log("\nFinal Result:", JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error("Script error:", err);
    process.exit(1);
  });
