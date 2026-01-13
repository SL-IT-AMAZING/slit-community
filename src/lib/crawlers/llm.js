/**
 * LLM 유틸리티 - Google Gemini API 사용
 * 무료 티어: 일 1,500 요청
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { logCrawl } from "./index.js";

let genAI = null;

function getClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * 텍스트 번역 (한글로)
 */
export async function translateToKorean(text) {
  const client = getClient();
  if (!client) {
    logCrawl("llm", "GEMINI_API_KEY not configured, skipping translation");
    return null;
  }

  try {
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `다음 텍스트를 자연스러운 한국어로 번역해주세요. 번역문만 출력하세요:\n\n${text}`
    );
    return result.response.text().trim();
  } catch (error) {
    logCrawl("llm", `Translation error: ${error.message}`);
    return null;
  }
}

/**
 * GitHub 레포지토리 요약 (JSON 형식)
 */
export async function summarizeRepo(repoName, description, readmeContent, language) {
  const client = getClient();
  if (!client) {
    logCrawl("llm", "GEMINI_API_KEY not configured, skipping summary");
    return null;
  }

  if (!readmeContent || readmeContent.length < 100) {
    return null;
  }

  try {
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `다음 GitHub 레포지토리를 분석하고 요약해주세요.

레포지토리: ${repoName}
설명: ${description || "(없음)"}
언어: ${language || "(미지정)"}

README (최대 4000자):
${readmeContent.slice(0, 4000)}

다음 형식으로 JSON 응답만 출력해주세요:
{
  "summary": "한 문장 요약 (한국어, 80자 이내)",
  "features": ["주요 기능 1", "주요 기능 2", "주요 기능 3"],
  "targetAudience": "주요 타겟 사용자 (한국어, 30자 이내)",
  "beginner_description": "초보 개발자를 위한 쉬운 설명 (한국어, 150자 이내)"
}

JSON만 출력하세요.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    logCrawl("llm", `Summary error: ${error.message}`);
    return null;
  }
}

/**
 * 이미지 분석 (LinkedIn 스크린샷 등)
 */
export async function analyzeImage(imageUrl, prompt) {
  const client = getClient();
  if (!client) {
    logCrawl("llm", "GEMINI_API_KEY not configured, skipping image analysis");
    return null;
  }

  try {
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 이미지 URL에서 base64로 변환
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = response.headers.get("content-type") || "image/png";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ]);

    return result.response.text().trim();
  } catch (error) {
    logCrawl("llm", `Image analysis error: ${error.message}`);
    return null;
  }
}
