import { createClient } from "@supabase/supabase-js";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Gemini 클라이언트 (API 키가 있을 때만)
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// YouTube 영상 ID 추출
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// 자막 추출
async function getTranscript(videoId) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "ko",
    });
    if (transcript && transcript.length > 0) {
      return {
        text: transcript.map((t) => t.text).join(" "),
        segments: transcript,
      };
    }
  } catch (e) {
    // 한국어 자막 실패 시 영어 시도
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "en",
      });
      if (transcript && transcript.length > 0) {
        return {
          text: transcript.map((t) => t.text).join(" "),
          segments: transcript,
        };
      }
    } catch (e2) {
      // 자동 생성 자막 시도
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        if (transcript && transcript.length > 0) {
          return {
            text: transcript.map((t) => t.text).join(" "),
            segments: transcript,
          };
        }
      } catch (e3) {
        // 자막 없음
      }
    }
  }
  return null;
}

// 타임스탬프 포맷
function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// 자막에서 타임라인 생성
function generateTimeline(segments) {
  if (!segments || segments.length === 0) return null;

  // 30초 단위로 그룹화
  const groups = [];
  let currentGroup = { start: 0, texts: [] };

  for (const seg of segments) {
    const segStart = seg.offset / 1000;
    if (segStart - currentGroup.start > 30 && currentGroup.texts.length > 0) {
      groups.push({
        timestamp: formatTimestamp(currentGroup.start),
        text: currentGroup.texts.join(" ").slice(0, 200),
      });
      currentGroup = { start: segStart, texts: [] };
    }
    currentGroup.texts.push(seg.text);
  }

  if (currentGroup.texts.length > 0) {
    groups.push({
      timestamp: formatTimestamp(currentGroup.start),
      text: currentGroup.texts.join(" ").slice(0, 200),
    });
  }

  return groups.map((g) => `[${g.timestamp}] ${g.text}`).join("\n");
}

// Gemini로 분석
async function analyzeWithGemini(title, transcript, rawData, thumbnailUrl) {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const contentParts = [];

  // 썸네일 이미지 추가 (있으면)
  if (thumbnailUrl) {
    try {
      const response = await fetch(thumbnailUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mediaType = response.headers.get("content-type") || "image/jpeg";
        contentParts.push({
          inlineData: {
            mimeType: mediaType,
            data: base64,
          },
        });
      }
    } catch (e) {
      // 썸네일 로드 실패 무시
    }
  }

  // 텍스트 프롬프트
  const prompt = `YouTube 영상을 분석해주세요.

제목: ${title}

${transcript ? `자막 내용:\n${transcript.slice(0, 15000)}` : "자막 없음 - 제목과 메타데이터만으로 분석해주세요."}

${rawData?.description ? `설명:\n${rawData.description.slice(0, 2000)}` : ""}

다음 JSON 형식으로 응답해주세요 (JSON만 출력, 다른 텍스트 없이):
{
  "recommendScore": (1-10 정수, 콘텐츠 품질/유용성 기준),
  "summary_oneline": "한 줄 요약 (50자 이내)",
  "intro": "200자 내외 소개글",
  "keyQA": [
    {"question": "핵심 질문1", "answer": "답변1"},
    {"question": "핵심 질문2", "answer": "답변2"},
    {"question": "핵심 질문3", "answer": "답변3"}
  ],
  "timeline": "타임스탬프 포함 상세 요약 (자막이 있으면 1500자 이상, 없으면 제목 기반 예상 내용)",
  "targetAudience": "대상 독자/시청자",
  "recommendReason": "추천 이유 (100자 내외)"
}`;

  contentParts.push(prompt);

  const result = await model.generateContent(contentParts);
  const text = result.response.text();

  // JSON 파싱
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error("JSON 파싱 실패");
}

// 규칙 기반 기본 분석 (API 없을 때)
function basicAnalysis(title, transcript, rawData) {
  const hasTranscript = !!transcript;
  const transcriptLength = transcript?.length || 0;
  const description = rawData?.description || "";

  // 키워드 기반 점수
  const techKeywords = [
    "AI",
    "GPT",
    "Claude",
    "LLM",
    "인공지능",
    "머신러닝",
    "API",
    "개발",
    "coding",
    "programming",
    "tutorial",
    "강의",
  ];
  const titleLower = title.toLowerCase();
  const keywordMatches = techKeywords.filter((k) =>
    titleLower.includes(k.toLowerCase()),
  ).length;

  let score = 5; // 기본 점수
  if (keywordMatches >= 3) score += 2;
  else if (keywordMatches >= 1) score += 1;
  if (hasTranscript && transcriptLength > 5000) score += 1;
  if (description.length > 500) score += 1;

  score = Math.min(10, Math.max(1, score));

  return {
    recommendScore: score,
    summary_oneline: title.slice(0, 50),
    intro: `${title}\n\n${description.slice(0, 150)}...`,
    keyQA: [
      { question: "이 영상의 주제는?", answer: title },
      { question: "자막 유무", answer: hasTranscript ? "있음" : "없음" },
      { question: "분석 방식", answer: "규칙 기반 (API 키 없음)" },
    ],
    timeline: transcript ? `자막 길이: ${transcriptLength}자` : "자막 없음",
    targetAudience: "일반 시청자",
    recommendReason: `키워드 매칭: ${keywordMatches}개, 자막: ${hasTranscript ? "있음" : "없음"}`,
  };
}

async function main() {
  console.log("YouTube 콘텐츠 분석 시작...\n");

  if (!genAI) {
    console.log("⚠️  GEMINI_API_KEY가 설정되지 않았습니다.");
    console.log("   규칙 기반 기본 분석을 수행합니다.\n");
  }

  // 점수 없는 YouTube 콘텐츠 조회
  const { data: contents, error } = await supabase
    .from("crawled_content")
    .select("*")
    .eq("platform", "youtube")
    .in("status", ["pending", "completed", "pending_analysis"]);

  if (error) {
    console.error("DB 조회 오류:", error);
    return;
  }

  // recommendScore가 없는 것만 필터링
  const needsAnalysis = contents.filter((c) => {
    const digest = c.digest_result;
    return (
      !digest ||
      digest.recommendScore === undefined ||
      digest.recommendScore === null
    );
  });

  console.log(
    `총 ${contents.length}개 중 분석 필요: ${needsAnalysis.length}개\n`,
  );

  if (needsAnalysis.length === 0) {
    console.log("분석할 콘텐츠가 없습니다.");
    return { analyzed: 0, avgScore: 0 };
  }

  let analyzed = 0;
  let totalScore = 0;
  const results = [];

  for (const item of needsAnalysis) {
    console.log(
      `[${analyzed + 1}/${needsAnalysis.length}] ${item.title?.slice(0, 50)}...`,
    );

    try {
      const videoId = extractVideoId(item.url);
      if (!videoId) {
        console.log("  영상 ID 추출 실패");
        continue;
      }

      // 자막 추출
      const transcriptData = await getTranscript(videoId);
      const transcript = transcriptData?.text;
      console.log(`  자막: ${transcript ? `${transcript.length}자` : "없음"}`);

      // 썸네일 URL
      const thumbnailUrl =
        item.raw_data?.thumbnail ||
        item.raw_data?.thumbnails?.high?.url ||
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      let analysis;

      if (genAI) {
        // Gemini 분석
        analysis = await analyzeWithGemini(
          item.title,
          transcript,
          item.raw_data,
          thumbnailUrl,
        );
      } else {
        // 규칙 기반 분석
        analysis = basicAnalysis(item.title, transcript, item.raw_data);

        // 자막 기반 타임라인 추가
        if (transcriptData?.segments) {
          const timeline = generateTimeline(transcriptData.segments);
          if (timeline) {
            analysis.timeline = timeline;
          }
        }
      }

      console.log(`  점수: ${analysis.recommendScore}/10`);

      // 기존 digest_result와 병합
      const mergedResult = {
        ...(item.digest_result || {}),
        ...analysis,
      };

      // DB 업데이트
      const { error: updateError } = await supabase
        .from("crawled_content")
        .update({
          digest_result: mergedResult,
          status: "pending",
        })
        .eq("id", item.id);

      if (updateError) {
        console.log(`  업데이트 오류: ${updateError.message}`);
        continue;
      }

      analyzed++;
      totalScore += analysis.recommendScore;
      results.push({
        title: item.title,
        score: analysis.recommendScore,
        summary: analysis.summary_oneline,
      });
    } catch (e) {
      console.log(`  분석 오류: ${e.message}`);
    }

    // Rate limit 방지
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n========== 분석 완료 ==========");
  console.log(`분석 완료: ${analyzed}개`);
  console.log(
    `평균 점수: ${analyzed > 0 ? (totalScore / analyzed).toFixed(1) : 0}/10`,
  );

  if (results.length > 0) {
    console.log("\n분석 결과:");
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.score}/10] ${r.title?.slice(0, 40)}...`);
      console.log(`     ${r.summary}`);
    });
  }

  return { analyzed, avgScore: analyzed > 0 ? totalScore / analyzed : 0 };
}

main().catch(console.error);
