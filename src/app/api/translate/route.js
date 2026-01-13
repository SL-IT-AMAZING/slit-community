import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const TRANSLATION_SYSTEM_PROMPT = `당신은 전문 번역가입니다. 주어진 텍스트를 자연스러운 한국어로 번역해주세요.

규칙:
1. 기술 용어는 적절히 유지하되, 필요시 괄호로 원어를 병기
2. 자연스러운 한국어 어순과 표현 사용
3. 원문의 뉘앙스와 톤 유지
4. 번역 결과만 출력 (추가 설명 없이)`;

/**
 * Claude를 사용하여 텍스트 번역
 */
async function translateWithClaude(anthropic, text, targetLang = "ko") {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: TRANSLATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `다음 텍스트를 ${targetLang === "ko" ? "한국어" : "영어"}로 번역해주세요:\n\n${text}`,
      },
    ],
  });

  return response.content[0].text;
}

/**
 * POST /api/translate
 *
 * Request body:
 * - text: string (번역할 텍스트)
 * - targetLang: string (optional, default: "ko")
 * - contentId: string (optional, DB에 저장할 경우 crawled_content id)
 * - field: string (optional, "title" | "content", 저장할 필드)
 */
export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const { text, targetLang = "ko", contentId, field } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    // 번역 수행
    const translated = await translateWithClaude(anthropic, text, targetLang);

    // contentId가 제공된 경우 DB에 저장
    if (contentId && field) {
      const updateField = field === "title" ? "translated_title" : "translated_content";
      const supabase = getSupabaseClient();

      const { error: updateError } = await supabase
        .from("crawled_content")
        .update({ [updateField]: translated })
        .eq("id", contentId);

      if (updateError) {
        console.error("Failed to save translation:", updateError);
        // 저장 실패해도 번역 결과는 반환
      }
    }

    return NextResponse.json({
      success: true,
      original: text,
      translated,
      targetLang,
      savedToDb: !!(contentId && field),
    });
  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to translate" },
      { status: 500 }
    );
  }
}
