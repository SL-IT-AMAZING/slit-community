#!/usr/bin/env node

/**
 * YouTube 영상 처리 자동화 스크립트
 *
 * queued 상태의 YouTube 콘텐츠를 가져와
 * 자막 추출 → 분석 → digest_result 저장 → completed 상태로 변경
 *
 * 사용법:
 *   node scripts/youtube-processor.js
 *
 * 환경 변수:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ANTHROPIC_API_KEY
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { getTranscript } from "../src/lib/youtube-transcript.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 로그 출력
 */
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * 레퍼런스 형식 분석 프롬프트
 */
const ANALYSIS_PROMPT = `다음 YouTube 영상 자막을 분석하여 아래 형식으로 정리해주세요.

## 출력 형식

### Part 1: 핵심 Q&A
📌 [영상 전체를 관통하는 핵심 질문 - "무엇인가?", "왜 중요한가?" 형태]
[1-2문장으로 압축된 답변. 구체적인 키워드와 핵심 개념 포함]

💡 [핵심 메커니즘/해결책에 대한 질문 - "어떻게 작동하는가?", "어떻게 해결하는가?" 형태]
[불릿 형태로 3-5개 핵심 포인트]
- [포인트 1]: [간결한 설명]
- [포인트 2]: [간결한 설명]
- [포인트 3]: [간결한 설명]

### Part 2: 소개 문구 (뉴스레터/SNS용)
[2-3문장. 다음 요소 포함:]
- 이 콘텐츠가 다루는 핵심 주제
- 독자가 배울 수 있는 구체적인 내용
- 행동 유도 (CTA) - "~를 얻어 가세요", "~를 이해하고 싶다면 반드시 확인해야 합니다"

### Part 3: 타임라인 노트
타임라인 노트: [영상 주제/제목]
[1-2문장 개요 - 이 문서가 다루는 내용과 핵심 포인트]

1. [대섹션 제목 - 영상의 주요 파트]
captureSource
[이 섹션의 핵심 내용 1-2문장]

[하위 주제 A]:
- [세부 내용 1 - 구체적인 설명이나 예시]
- [세부 내용 2]
- [세부 내용 3]

[하위 주제 B]:
- [세부 내용 1]
- [세부 내용 2]

1.1. [소섹션 제목 - 더 세부적인 주제]
captureSource
[소섹션 설명]

- [불릿 포인트들]

2. [다음 대섹션 제목]
captureSource
[섹션 핵심]

... (영상 길이에 따라 3-6개 대섹션)

[마무리 섹션]
captureSource
[결론, 다음 단계, 또는 핵심 시사점]

## 분석 시 주의사항
1. captureSource 태그는 각 대섹션과 소섹션 시작에 포함
2. 구체적인 숫자, 데이터, 예시가 있으면 반드시 포함
3. 비유나 비교가 있으면 활용 ("~와 같습니다")
4. 전문 용어는 괄호 안에 영어 원어 병기
5. 계층 구조 유지: 대섹션 > 소섹션 > 하위 주제 > 불릿

---

영상 정보:
제목: {title}
채널: {author}
URL: {url}

자막:
{transcript}`;

/**
 * 자막 분석
 */
async function analyzeTranscript(title, author, url, transcript) {
  const prompt = ANALYSIS_PROMPT
    .replace("{title}", title)
    .replace("{author}", author)
    .replace("{url}", url)
    .replace("{transcript}", transcript);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.content[0].text;
}

/**
 * 단일 영상 처리
 */
async function processVideo(content) {
  const { id, platform_id, title, author_name, url } = content;

  log(`Processing: ${title} (${platform_id})`);

  try {
    // 1. 상태를 processing으로 변경
    await supabase
      .from("crawled_content")
      .update({ status: "processing" })
      .eq("id", id);

    // 2. 자막 추출
    log(`Extracting transcript for ${platform_id}...`);
    const transcriptResult = await getTranscript(platform_id);

    if (!transcriptResult?.text) {
      throw new Error("Failed to extract transcript");
    }

    log(`Transcript extracted: ${transcriptResult.text.length} characters`);

    // 3. 분석 수행
    log(`Analyzing with Claude...`);
    const analysis = await analyzeTranscript(
      title,
      author_name,
      url,
      transcriptResult.text
    );

    // 4. 결과 저장
    const digestResult = {
      analysis,
      transcriptLength: transcriptResult.text.length,
      processedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("crawled_content")
      .update({
        status: "completed",
        digest_result: digestResult,
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    log(`Completed: ${title}`);
    return { success: true, id };
  } catch (error) {
    log(`Error processing ${platform_id}: ${error.message}`);

    // 에러 발생 시 상태를 queued로 되돌림
    await supabase
      .from("crawled_content")
      .update({
        status: "queued",
        digest_result: {
          error: error.message,
          failedAt: new Date().toISOString(),
        },
      })
      .eq("id", id);

    return { success: false, id, error: error.message };
  }
}

/**
 * 메인 처리 함수
 */
async function processAllQueued() {
  log("Starting YouTube processor...");

  // queued 상태의 YouTube 콘텐츠 조회
  const { data: queuedContent, error } = await supabase
    .from("crawled_content")
    .select("id, platform_id, title, author_name, url")
    .eq("platform", "youtube")
    .eq("status", "queued")
    .order("crawled_at", { ascending: true });

  if (error) {
    log(`Error fetching queued content: ${error.message}`);
    return;
  }

  if (!queuedContent || queuedContent.length === 0) {
    log("No queued YouTube content to process");
    return;
  }

  log(`Found ${queuedContent.length} queued videos to process`);

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const content of queuedContent) {
    const result = await processVideo(content);

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        id: result.id,
        error: result.error,
      });
    }

    // Rate limiting: 2초 대기
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  log(`Processing complete. Success: ${results.success}, Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    log("Errors:");
    results.errors.forEach((e) => log(`  - ${e.id}: ${e.error}`));
  }
}

// 스크립트 실행
processAllQueued()
  .then(() => {
    log("Script finished");
    process.exit(0);
  })
  .catch((error) => {
    log(`Script error: ${error.message}`);
    process.exit(1);
  });
