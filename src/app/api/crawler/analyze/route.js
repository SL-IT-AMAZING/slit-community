import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  getCrawledById,
  updateCrawledStatus,
  saveCrawledDigest,
} from "@/services/supabase";
import { getTranscript } from "@/lib/youtube-transcript";

const SYSTEM_PROMPT = `당신은 콘텐츠 큐레이터입니다. 주어진 콘텐츠를 분석하여 다음 형식으로 정리해주세요:

## 분석 결과 형식:
- **제목**: 핵심을 담은 한줄 제목
- **요약**: 2-3문장 핵심 요약
- **주요 포인트**: 3-5개 불릿 포인트
- **카테고리 태그**: 관련 태그 3-5개 (예: #AI, #개발, #트렌드)
- **추천 점수**: 1-10 (뉴스레터 포함 가치 기준)
- **추천 이유**: 왜 이 점수를 줬는지 1-2문장

콘텐츠가 한국어가 아니면 한국어로 번역하여 정리해주세요.`;

/**
 * Claude를 사용하여 콘텐츠 분석
 */
async function analyzeWithClaude(anthropic, type, data) {
  let messages;

  if (type === "screenshot") {
    // 스크린샷 분석 (Vision)
    messages = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",
              url: data.screenshotUrl,
            },
          },
          {
            type: "text",
            text: `이 SNS 스크린샷을 분석해주세요.

플랫폼: ${data.platform}
URL: ${data.url}

게시물의 내용을 파악하고 분석 결과를 제공해주세요.`,
          },
        ],
      },
    ];
  } else if (type === "youtube") {
    // YouTube 트랜스크립트 분석
    messages = [
      {
        role: "user",
        content: `다음 YouTube 영상을 분석해주세요:

제목: ${data.title}
채널: ${data.author}
URL: ${data.url}

${data.transcript ? `트랜스크립트:\n${data.transcript}` : "트랜스크립트가 없습니다. 제목과 설명만으로 분석해주세요."}

${data.description ? `설명:\n${data.description}` : ""}`,
      },
    ];
  } else {
    // 텍스트 기반 분석 (Reddit 등)
    messages = [
      {
        role: "user",
        content: `다음 콘텐츠를 분석해주세요:

플랫폼: ${data.platform}
제목: ${data.title}
작성자: ${data.author}
URL: ${data.url}

내용:
${data.content || data.description || "(내용 없음)"}`,
      },
    ];
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
  });

  return response.content[0].text;
}

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

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        // 아이템 조회
        const item = await getCrawledById(id);

        if (!item) {
          errors.push({ id, error: "Not found" });
          continue;
        }

        // 상태 업데이트: processing
        await updateCrawledStatus([id], "processing");

        let digestResult;

        if (item.platform === "youtube") {
          // YouTube: 트랜스크립트 추출 후 분석
          const transcriptResult = await getTranscript(item.platform_id);

          digestResult = await analyzeWithClaude(anthropic, "youtube", {
            title: item.title,
            author: item.author_name,
            url: item.url,
            description: item.description,
            transcript: transcriptResult.text,
          });
        } else if (item.screenshot_url) {
          // SNS (스크린샷 있는 경우): Vision 분석
          digestResult = await analyzeWithClaude(anthropic, "screenshot", {
            platform: item.platform,
            url: item.url,
            screenshotUrl: item.screenshot_url,
          });
        } else {
          // Reddit 등 텍스트 기반
          digestResult = await analyzeWithClaude(anthropic, "text", {
            platform: item.platform,
            title: item.title,
            author: item.author_name,
            url: item.url,
            content: item.content_text,
            description: item.description,
          });
        }

        // 분석 결과 저장
        await saveCrawledDigest(id, {
          analysis: digestResult,
          analyzed_at: new Date().toISOString(),
        });

        // 번역은 슬래시 커맨드 플로우에서 별도로 진행

        results.push({ id, success: true });
      } catch (error) {
        console.error(`Error analyzing item ${id}:`, error);
        errors.push({ id, error: error.message });

        // 에러 발생 시 상태를 pending으로 되돌림
        await updateCrawledStatus([id], "pending");
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: ids.length,
        succeeded: results.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze content" },
      { status: 500 }
    );
  }
}
