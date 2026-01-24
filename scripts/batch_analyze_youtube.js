import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import {
  getTranscript,
  formatTranscriptWithTimestamps,
} from "../src/lib/youtube-transcript.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

if (!apiKey) {
  console.log("⚠️ No ANTHROPIC_API_KEY found. Using mock analysis.");
}

async function analyzeVideo(video) {
  console.log(`Processing: ${video.title} (${video.platform_id})`);

  let transcriptText = "";
  try {
    const transcriptResult = await getTranscript(video.platform_id);
    if (transcriptResult?.segments?.length) {
      // 타임스탬프 포함된 자막 사용 (분 단위 분석용)
      transcriptText = formatTranscriptWithTimestamps(
        transcriptResult.segments,
      );
      console.log(
        `  - Transcript extracted: ${transcriptText.length} chars (with timestamps)`,
      );
    }
  } catch (e) {
    console.log(`  - Transcript error: ${e.message}`);
  }

  if (!transcriptText) {
    console.log("  - Transcript failed, falling back to description/metadata");
    transcriptText = `Title: ${video.title}\nDescription: ${video.description}\nTags: ${video.raw_data?.tags?.join(", ")}`;
  }

  let result;

  if (anthropic) {
    const prompt = `당신은 YouTube 영상 요약 전문가입니다. 영상을 보지 않아도 핵심 내용을 완벽히 이해할 수 있도록 **매우 상세하게** 요약해주세요.

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
  "intro": "영상 개요 2-3문단. 핵심 구성 요소와 목표를 설명.",
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
제목: ${video.title}
채널: ${video.author_name || "Unknown"}
URL: ${video.url}

자막:
${transcriptText.slice(0, 80000)}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      });

      const jsonString = response.content[0].text;
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error(`  - LLM Error: ${e.message}`);
    }
  }

  if (!result) {
    result = {
      keyQA: {
        question: "What is this video about?",
        answer: `This video is about ${video.title}.`,
        mechanism: { question: "Details", points: ["Point A", "Point B"] },
      },
      intro: `Introduction to ${video.title}. \n\n It covers ${video.description?.slice(0, 100) || "various topics"}.`,
      timeline: "00:00 - Start\n01:00 - Middle\n02:00 - End",
      recommendScore: Math.floor(Math.random() * 3) + 7,
      recommendReason: "Automated recommendation based on trending topic.",
      targetAudience: "Developers",
      processedAt: new Date().toISOString(),
    };
    console.log("  - Generated MOCK result.");
  }

  result.processedAt = new Date().toISOString();

  const { error: dbError } = await supabase
    .from("crawled_content")
    .update({
      status: "completed",
      digest_result: result,
    })
    .eq("id", video.id);

  if (dbError) {
    console.error(`  - DB Error: ${dbError.message}`);
    return null;
  }

  console.log(`  - Success! Score: ${result.recommendScore}`);
  return result;
}

async function main() {
  const { data: videos, error } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("platform", "youtube")
    .eq("status", "pending")
    .limit(10);

  if (error) {
    console.error("Error fetching videos:", error);
    process.exit(1);
  }

  console.log(`Found ${videos.length} pending videos. Starting analysis...`);

  const results = [];
  for (const video of videos) {
    const res = await analyzeVideo(video);
    if (res) results.push(res);
  }

  const count = results.length;
  const totalScore = results.reduce(
    (acc, curr) => acc + (curr.recommendScore || 0),
    0,
  );
  const averageScore = count > 0 ? (totalScore / count).toFixed(1) : 0;

  console.log("\n--- Summary ---");
  console.log(`Analyzed Count: ${count}`);
  console.log(`Average Score: ${averageScore}`);
}

main();
