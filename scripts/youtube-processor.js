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
import dotenv from "dotenv";
import {
  getTranscript,
  formatTranscriptWithTimestamps,
} from "../src/lib/youtube-transcript.js";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
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

const ANALYSIS_PROMPT = `당신은 YouTube 영상 요약 전문가입니다. 영상을 보지 않아도 핵심 내용을 완벽히 이해할 수 있도록 **매우 상세하게** 요약해주세요.

## 출력 형식 (반드시 JSON으로 출력)

\`\`\`json
{
  "keyQA": {
    "question": "📌 [영상의 핵심 질문]은 무엇이며, [핵심 개념]은 무엇인가?",
    "answer": "영상 전체를 관통하는 핵심 답변 1-2문장",
    "mechanism": {
      "question": "💡 [메커니즘/원리 질문]?",
      "points": [
        "포인트 1: 구체적 설명",
        "포인트 2: 구체적 설명",
        "포인트 3: 구체적 설명",
        "포인트 4: 구체적 설명 (필요시)",
        "포인트 5: 구체적 설명 (필요시)"
      ]
    }
  },
  "intro": "영상 개요 2-3문단. 핵심 구성 요소와 목표를 설명. 예: 'Langchain에서 소개하는 X는 Y하는 혁신적인 접근 방식입니다.\\n\\n핵심 구성 요소: Z를 사용하여 W를 보여준다.\\n\\n목표: A에게 B를 부여하고, C를 추적하며 D를 구축하는 실용적인 인사이트를 제공한다.'",
  "timeline": "상세 타임라인 노트 (타임스탬프 기반, 최소 1500자)\\n\\n**0:00** - 인트로\\n영상 소개 및 개요\\n\\n**1:30** - 1. 대섹션 제목\\n핵심 내용 1-2문장\\n\\n[하위 주제 A]:\\n- 세부 내용 1\\n- 세부 내용 2\\n\\n**3:45** - 1.1. 소섹션 제목\\n소섹션 설명\\n\\n- 불릿 포인트들\\n\\n**7:20** - 2. 다음 대섹션\\n...",
  "recommendScore": 8,
  "recommendReason": "추천 이유 1-2문장",
  "targetAudience": "이 영상이 도움될 대상"
}
\`\`\`

## 작성 가이드라인

### keyQA (핵심 Q&A)
- question: "~은 무엇이며, ~은 어떻게 하는가?" 형태
- answer: 핵심 개념과 중요성을 담은 1-2문장
- mechanism.question: "~가 ~를 처리하는 원리는?" 형태
- mechanism.points: 핵심 메커니즘 3-5개 (구체적 설명 포함)

### intro (영상 개요)
- 2-3문단으로 영상 전체 소개
- "핵심 구성 요소:", "목표:" 등 라벨 포함
- 시청자가 얻을 인사이트 명시

### timeline (상세 타임라인) - 가장 중요!
- **최소 1500자 이상** 작성
- **실제 타임스탬프 사용**: 자막의 [M:SS] 형식을 참고하여 각 섹션 시작 시간을 **0:00**, **1:30**, **7:20** 형식으로 표기
- 형식: **타임스탬프** - 섹션 제목\\n내용
- 계층 구조 엄격 준수: 1. > 1.1. > 1.2. > 2. > 2.1.
- 구체적인 내용, 예시, 인용 포함
- 영상의 90% 내용을 담아야 함

### 추천점수 기준
| 점수 | 기준 |
|------|------|
| 9-10 | 반드시 포함. 트렌드 선도 |
| 7-8 | 포함 권장. 유익함 |
| 5-6 | 선택적. 특별하지 않음 |
| 3-4 | 비추천 |
| 1-2 | 제외 |

## 주의사항
- 반드시 유효한 JSON 형식으로만 출력 (JSON 외 텍스트 금지)
- 한국어로 작성
- 전문 용어는 영어 원어 병기 (예: 딥 에이전트(Deep Agent))
- 숫자, 도구명, 방법론 반드시 포함
- timeline에서 줄바꿈은 \\n으로 표현

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
  const prompt = ANALYSIS_PROMPT.replace("{title}", title)
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

    if (!transcriptResult?.segments?.length) {
      throw new Error("Failed to extract transcript");
    }

    const timestampedTranscript = formatTranscriptWithTimestamps(
      transcriptResult.segments,
    );
    log(
      `Transcript extracted: ${timestampedTranscript.length} characters (with timestamps)`,
    );

    // 3. 분석 수행
    log(`Analyzing with Claude...`);
    const analysis = await analyzeTranscript(
      title,
      author_name,
      url,
      timestampedTranscript,
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

  log(
    `Processing complete. Success: ${results.success}, Failed: ${results.failed}`,
  );

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
