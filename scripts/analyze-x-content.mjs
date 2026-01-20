/**
 * X 콘텐츠 분석 스크립트
 * pending_analysis 상태의 X 콘텐츠를 분석하여 DB 업데이트
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local first
dotenv.config({ path: ".env.local" });
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Gemini 클라이언트
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 이미지를 base64로 인코딩
 */
function imageToBase64(imagePath) {
  let absolutePath = imagePath;

  // If path starts with /screenshots, treat it as relative to public directory
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
 * Gemini Vision으로 스크린샷에서 텍스트 추출
 */
async function extractTextFromScreenshot(screenshotPath) {
  try {
    const base64Image = imageToBase64(screenshotPath);
    if (!base64Image) return null;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image,
        },
      },
      `Extract the main tweet/post text content from this X (Twitter) screenshot.
Return ONLY the text content of the post, nothing else.
Do not include username, handle, timestamp, metrics, or any UI elements.
If there are multiple posts visible, extract only the main/focused post.`,
    ]);

    return result.response.text().trim();
  } catch (error) {
    console.error("Vision extraction error:", error.message);
    return null;
  }
}

/**
 * Gemini로 콘텐츠 분석
 */
async function analyzeContent(content, authorHandle, screenshotUrl) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Analyze this X (Twitter) post and provide a structured analysis.

Author: ${authorHandle || "Unknown"}
Content:
${content}

Respond in JSON format with these fields:
{
  "summary_oneline": "One sentence summary in Korean (한국어로 작성)",
  "content_ko": "Full Korean translation of the content",
  "content_en": "English version (if original is Korean, translate to English; if already English, keep as is)",
  "categories": ["array of relevant categories from: AI, Tech, Programming, Startup, Design, Career, Opinion, News, Tutorial, Humor"],
  "metrics": {
    "engagement_potential": "high/medium/low",
    "information_value": "high/medium/low",
    "originality": "high/medium/low"
  },
  "recommendScore": 1-10 (integer, based on relevance to AI/Tech professionals, information value, and engagement potential),
  "recommendReason": "Brief reason for the score in Korean"
}

Return ONLY valid JSON, no markdown or additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // JSON 파싱 시도
    let parsed;
    try {
      // 마크다운 코드 블록 제거
      const jsonText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON parse error:", e.message);
      console.log("Raw response:", responseText.substring(0, 500));
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Analysis error:", error.message);
    return null;
  }
}

/**
 * 메인 분석 함수
 */
async function analyzeXContent() {
  console.log("=== X Content Analysis Started ===\n");

  // pending_analysis 상태의 X 콘텐츠 조회
  const { data: records, error } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("platform", "x")
    .eq("status", "pending_analysis")
    .order("crawled_at", { ascending: false });

  if (error) {
    console.error("DB query error:", error);
    return;
  }

  console.log(`Found ${records?.length || 0} records to analyze\n`);

  if (!records || records.length === 0) {
    console.log("No pending_analysis records found for X platform");
    return { analyzed: 0, avgScore: 0 };
  }

  let analyzed = 0;
  let totalScore = 0;
  const results = [];

  for (const record of records) {
    console.log(`\n--- Processing: ${record.platform_id} ---`);
    console.log(`URL: ${record.url}`);
    console.log(`Author: ${record.author_name || "Unknown"}`);

    // 1. 콘텐츠 텍스트 확보
    let contentText = record.raw_data?.content || "";

    if (!contentText && record.screenshot_url) {
      console.log("Content empty, extracting from screenshot...");
      contentText = await extractTextFromScreenshot(record.screenshot_url);
    }

    if (!contentText) {
      console.log("Could not extract content, skipping...");
      continue;
    }

    console.log(
      `Content (${contentText.length} chars): ${contentText.substring(0, 100)}...`,
    );

    // 2. Gemini로 분석
    console.log("Analyzing with Gemini...");
    const analysis = await analyzeContent(
      contentText,
      record.author_name,
      record.screenshot_url,
    );

    if (!analysis) {
      console.log("Analysis failed, skipping...");
      continue;
    }

    console.log(`Summary: ${analysis.summary_oneline}`);
    console.log(`Score: ${analysis.recommendScore}/10`);
    console.log(`Categories: ${analysis.categories?.join(", ")}`);

    // 3. DB 업데이트
    const authorName = record.author_name?.replace("@", "") || "Unknown";
    const updateData = {
      title: `${authorName} - ${analysis.summary_oneline}`,
      content_text: analysis.content_en,
      translated_content: analysis.content_ko,
      digest_result: {
        summary_oneline: analysis.summary_oneline,
        categories: analysis.categories,
        metrics: analysis.metrics,
        author_handle: record.author_name,
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
      author: record.author_name,
      summary: analysis.summary_oneline,
      score: analysis.recommendScore,
      categories: analysis.categories,
    });

    // API 레이트 리밋 방지 (Gemini free tier: 분당 15 요청)
    await new Promise((r) => setTimeout(r, 5000));
  }

  const avgScore = analyzed > 0 ? (totalScore / analyzed).toFixed(2) : 0;

  console.log("\n=== Analysis Complete ===");
  console.log(`Analyzed: ${analyzed} records`);
  console.log(`Average Score: ${avgScore}/10`);

  console.log("\n=== Results Summary ===");
  results.forEach((r, i) => {
    console.log(`${i + 1}. [${r.score}/10] ${r.author}: ${r.summary}`);
  });

  return { analyzed, avgScore: parseFloat(avgScore), results };
}

// 실행
analyzeXContent()
  .then((result) => {
    console.log("\nFinal Result:", JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error("Script error:", err);
    process.exit(1);
  });
