import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const sampleNewsletters = [
  {
    issue_number: 1,
    subject: "[AI Community] 2025년 AI 트렌드 총정리 #1",
    content: {
      greeting: "새해 복 많이 받으세요! 🎉",
      intro:
        "2025년 첫 뉴스레터입니다. 이번 주는 올해 주목해야 할 AI 트렌드와 핫한 오픈소스 프로젝트들을 정리했습니다.",
      sections: [
        {
          emoji: "🔥",
          title: "이번 주 하이라이트",
          items: [
            {
              title: "GPT-5 출시 임박? OpenAI CEO 힌트 공개",
              summary:
                "샘 알트만이 최근 인터뷰에서 차세대 모델에 대한 힌트를 남겼습니다. 멀티모달 성능이 크게 향상될 것으로 예상됩니다.",
              url: "https://example.com/gpt5",
              platform: "X",
            },
            {
              title: "Claude 3.5 Sonnet, 코딩 벤치마크 1위 달성",
              summary:
                "Anthropic의 최신 모델이 SWE-bench에서 역대 최고 점수를 기록했습니다. 실제 개발 업무에서의 활용도가 높아질 전망입니다.",
              url: "https://example.com/claude",
              platform: "X",
            },
          ],
        },
        {
          emoji: "📺",
          title: "추천 영상",
          items: [
            {
              title: "AI 에이전트 만들기 - 실전 튜토리얼",
              summary:
                "LangChain과 OpenAI를 활용해 실제 업무에 쓸 수 있는 AI 에이전트를 만드는 방법을 단계별로 설명합니다.",
              url: "https://youtube.com/example1",
              platform: "YouTube",
            },
          ],
        },
        {
          emoji: "🛠️",
          title: "오픈소스 픽",
          items: [
            {
              title: "Ollama - 로컬 LLM 실행의 정석",
              summary:
                "M1/M2 맥에서 Llama, Mistral 등 오픈소스 LLM을 쉽게 실행할 수 있는 도구입니다. 이번 주 스타 1만개 돌파!",
              url: "https://github.com/ollama/ollama",
              platform: "GitHub",
            },
          ],
        },
      ],
    },
    recipients_count: 150,
    sent_count: 148,
    failed_count: 2,
    sent_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    issue_number: 2,
    subject: "[AI Community] Sora 드디어 공개! #2",
    content: {
      greeting: "안녕하세요, AI 덕후 여러분! 👋",
      intro:
        "이번 주 최대 뉴스는 단연 OpenAI Sora의 공개입니다. 영상 생성 AI의 새로운 시대가 열렸습니다.",
      sections: [
        {
          emoji: "🔥",
          title: "이번 주 하이라이트",
          items: [
            {
              title: "OpenAI Sora 정식 공개 - 1분 영상 생성 가능",
              summary:
                "텍스트만으로 1분짜리 고품질 영상을 생성할 수 있습니다. 아직 대기자 명단이지만, 크리에이터들의 관심이 폭발적입니다.",
              url: "https://example.com/sora",
              platform: "X",
            },
            {
              title: "Google Gemini 2.0 발표",
              summary:
                "구글이 Gemini 2.0을 발표했습니다. 특히 코드 생성과 수학 문제 해결 능력이 크게 향상되었습니다.",
              url: "https://example.com/gemini2",
              platform: "X",
            },
          ],
        },
        {
          emoji: "💡",
          title: "인사이트",
          items: [
            {
              title: "AI 스타트업 투자 트렌드 2025",
              summary:
                "올해 AI 투자는 인프라보다 애플리케이션 레이어에 집중될 전망입니다. 특히 버티컬 SaaS AI 솔루션이 주목받고 있습니다.",
              url: "https://example.com/investment",
              platform: "LinkedIn",
            },
          ],
        },
        {
          emoji: "🛠️",
          title: "오픈소스 픽",
          items: [
            {
              title: "Open-Sora - 오픈소스 Sora 대안",
              summary:
                "Sora에 자극받은 오픈소스 커뮤니티가 빠르게 대안을 개발 중입니다. 아직 초기 단계지만 발전 속도가 놀랍습니다.",
              url: "https://github.com/hpcaitech/Open-Sora",
              platform: "GitHub",
            },
          ],
        },
      ],
    },
    recipients_count: 180,
    sent_count: 178,
    failed_count: 2,
    sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    issue_number: 3,
    subject: "[AI Community] MCP 프로토콜이 바꿀 AI 개발의 미래 #3",
    content: {
      greeting: "즐거운 금요일입니다! 🚀",
      intro:
        "이번 주는 Anthropic이 공개한 MCP(Model Context Protocol)가 화제입니다. AI 도구 연동의 표준이 될 수 있을까요?",
      sections: [
        {
          emoji: "🔥",
          title: "이번 주 하이라이트",
          items: [
            {
              title: "Anthropic MCP 프로토콜 공개",
              summary:
                "AI 모델이 외부 도구와 소통하는 표준 프로토콜입니다. Claude Desktop에서 먼저 지원하며, 생태계 확장이 기대됩니다.",
              url: "https://example.com/mcp",
              platform: "X",
            },
            {
              title: "Cursor + Claude 조합의 위력",
              summary:
                "Cursor IDE에서 Claude를 활용한 개발 생산성이 화제입니다. 실제 사용자들의 후기가 쏟아지고 있습니다.",
              url: "https://example.com/cursor",
              platform: "Reddit",
            },
          ],
        },
        {
          emoji: "📺",
          title: "추천 영상",
          items: [
            {
              title: "MCP 프로토콜 완벽 가이드",
              summary:
                "MCP의 개념부터 실제 구현까지 상세하게 다룬 튜토리얼입니다. AI 개발자라면 필수 시청!",
              url: "https://youtube.com/example2",
              platform: "YouTube",
            },
          ],
        },
        {
          emoji: "🛠️",
          title: "오픈소스 픽",
          items: [
            {
              title: "smolagents - HuggingFace의 경량 에이전트",
              summary:
                "HuggingFace에서 공개한 가벼운 AI 에이전트 프레임워크입니다. 코드가 깔끔하고 학습하기 좋습니다.",
              url: "https://github.com/huggingface/smolagents",
              platform: "GitHub",
            },
            {
              title: "browser-use - AI 브라우저 자동화",
              summary:
                "AI가 웹 브라우저를 직접 조작하는 도구입니다. RPA와 AI의 결합으로 업무 자동화의 새 지평을 엽니다.",
              url: "https://github.com/browser-use/browser-use",
              platform: "GitHub",
            },
          ],
        },
      ],
    },
    recipients_count: 210,
    sent_count: 208,
    failed_count: 2,
    sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

async function seedNewsletters() {
  console.log("Seeding sample newsletters...");

  for (const newsletter of sampleNewsletters) {
    const { error } = await supabase
      .from("newsletter_sends")
      .insert(newsletter);

    if (error) {
      console.error(
        `Failed to insert newsletter #${newsletter.issue_number}:`,
        error.message,
      );
    } else {
      console.log(`✓ Newsletter #${newsletter.issue_number} created`);
    }
  }

  console.log("Done!");
}

seedNewsletters();
