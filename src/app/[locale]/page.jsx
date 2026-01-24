import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ContentCard from "@/components/content/content-card";
import LinkPreviewCard from "@/components/content/link-preview-card";
import LatestContentSection from "@/components/content/latest-content-section";

import {
  fetchFeaturedContent,
  fetchLatestByPlatform,
  fetchRecommendedContent,
} from "@/services/supabase";

import NewsletterFeatured from "@/components/newsletter/newsletter-featured";

import {
  FaArrowRight,
  FaNewspaper,
  FaRobot,
  FaLightbulb,
  FaChartLine,
  FaBook,
  FaBrain,
  FaGraduationCap,
  FaCode,
} from "react-icons/fa6";

const OG_IMAGE_REGEX = [
  /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
];

async function fetchOgImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OGBot/1.0)" },
      next: { revalidate: 86400 },
    });
    const html = await response.text();

    for (const pattern of OG_IMAGE_REGEX) {
      const match = html.match(pattern);
      if (match) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

function getKnownPlatformOgImage(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, "");
    const pathname = urlObj.pathname;

    if (hostname === "github.com") {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return `https://opengraph.githubassets.com/1/${parts[0]}/${parts[1]}`;
      }
    }

    if (hostname === "youtube.com" || hostname === "youtu.be") {
      const videoId = urlObj.searchParams.get("v") || pathname.split("/").pop();
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function enrichContentWithThumbnails(contentList) {
  return Promise.all(
    contentList.map(async (content) => {
      if (content.thumbnail_url) return content;

      const knownOg = getKnownPlatformOgImage(content.external_url);
      if (knownOg) return { ...content, thumbnail_url: knownOg };

      const fetchedOg = await fetchOgImage(content.external_url);
      if (fetchedOg) return { ...content, thumbnail_url: fetchedOg };

      return content;
    }),
  );
}

const categories = [
  { id: "ai-basics", icon: FaRobot },
  { id: "llm", icon: FaBrain },
  { id: "image-generation", icon: FaLightbulb },
  { id: "ai-tools", icon: FaCode },
  { id: "claude-code", icon: FaGraduationCap },
  { id: "industry-trends", icon: FaChartLine },
  { id: "open-source", icon: FaCode },
  { id: "ai-monetization", icon: FaChartLine },
  { id: "research-papers", icon: FaBook },
];

// 목데이터 - 최신 콘텐츠
const MOCK_LATEST_CONTENT = [
  // YouTube
  {
    id: "yt-1",
    type: "video",
    title: "GPT-5 출시 예정! 달라지는 점 총정리",
    description:
      "OpenAI의 차세대 모델 GPT-5의 예상 기능과 변화점을 상세히 분석합니다.",
    published_at: "2025-01-10T10:00:00Z",
    external_url: "https://youtube.com/watch?v=example1",
    thumbnail_url: "https://picsum.photos/seed/yt1/640/360",
    social_metadata: {
      videoId: "dQw4w9WgXcQ",
      channelName: "AI 트렌드",
      channelAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=aitrend",
      viewCount: 125000,
      likeCount: 8500,
      duration: "15:32",
    },
    author_info: {
      name: "AI 트렌드",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=aitrend",
    },
  },
  {
    id: "yt-2",
    type: "video",
    title: "Claude 3.5 vs GPT-4o 실전 비교 테스트",
    description: "두 모델의 코딩, 분석, 창작 능력을 직접 비교해봅니다.",
    published_at: "2025-01-09T14:30:00Z",
    external_url: "https://youtube.com/watch?v=example2",
    thumbnail_url: "https://picsum.photos/seed/yt2/640/360",
    social_metadata: {
      videoId: "abc123xyz",
      channelName: "테크리뷰",
      channelAvatar:
        "https://api.dicebear.com/7.x/avataaars/svg?seed=techreview",
      viewCount: 89000,
      likeCount: 6200,
      duration: "22:15",
    },
    author_info: {
      name: "테크리뷰",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=techreview",
    },
  },
  // X (Twitter)
  {
    id: "x-1",
    type: "x-thread",
    title: "AI 업계 소식",
    description:
      "오늘 발표된 Anthropic의 새로운 헌법적 AI 연구 결과가 정말 인상적입니다. 모델의 안전성과 정렬에 대한 새로운 접근 방식을 제시하고 있어요. 스레드로 정리해봤습니다 🧵",
    published_at: "2025-01-10T08:00:00Z",
    external_url: "https://x.com/aiexpert/status/123",
    social_metadata: {
      authorHandle: "aiexpert",
      likeCount: 2340,
      retweetCount: 892,
      replyCount: 156,
      mediaUrls: [],
    },
    author_info: {
      name: "AI Expert",
      handle: "aiexpert",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=aiexpert",
      verified: true,
    },
  },
  {
    id: "x-2",
    type: "x-thread",
    title: "프롬프트 엔지니어링 팁",
    description:
      "프롬프트 엔지니어링 5년차의 꿀팁 대방출! Chain of Thought를 제대로 활용하는 방법부터 시스템 프롬프트 최적화까지 모두 공개합니다.",
    published_at: "2025-01-09T16:20:00Z",
    external_url: "https://x.com/promptmaster/status/456",
    social_metadata: {
      authorHandle: "promptmaster",
      likeCount: 5670,
      retweetCount: 1230,
      replyCount: 342,
      mediaUrls: ["https://picsum.photos/seed/xmedia1/600/400"],
    },
    author_info: {
      name: "프롬프트 마스터",
      handle: "promptmaster",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=promptmaster",
      verified: false,
    },
  },
  // LinkedIn
  {
    id: "li-1",
    type: "linkedin",
    title: "AI 채용 트렌드",
    description:
      "2025년 AI 엔지니어 채용 시장 분석입니다. 지난 1년간 AI/ML 관련 채용이 340% 증가했으며, 특히 LLM 전문가와 프롬프트 엔지니어에 대한 수요가 급증하고 있습니다. 주요 기업들의 연봉 동향과 필요 스킬셋을 정리했습니다.",
    published_at: "2025-01-10T09:00:00Z",
    external_url: "https://linkedin.com/posts/hrmanager-ai123",
    social_metadata: {
      authorTitle: "HR Director at TechCorp",
      likeCount: 1250,
      commentCount: 89,
      repostCount: 234,
    },
    author_info: {
      name: "김채용",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hrkim",
      subtitle: "HR Director at TechCorp",
    },
  },
  {
    id: "li-2",
    type: "linkedin",
    title: "스타트업 AI 도입기",
    description:
      "우리 스타트업이 AI를 도입하면서 겪은 시행착오와 배움을 공유합니다. 처음에는 모든 것을 AI로 자동화하려 했지만, 결국 사람과 AI의 협업이 핵심이라는 것을 깨달았습니다.",
    published_at: "2025-01-08T11:30:00Z",
    external_url: "https://linkedin.com/posts/ceo-startup456",
    social_metadata: {
      authorTitle: "CEO & Founder at AIStartup",
      likeCount: 3420,
      commentCount: 156,
      repostCount: 567,
    },
    author_info: {
      name: "이창업",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ceolee",
      subtitle: "CEO & Founder at AIStartup",
    },
  },
  // Threads
  {
    id: "th-1",
    type: "threads",
    title: "AI 아트 제작기",
    description:
      "Midjourney v6로 만든 작품들입니다 ✨ 이번에 새로 추가된 스타일 레퍼런스 기능이 정말 대단해요. 원하는 분위기를 정확하게 재현할 수 있어서 작업 효율이 확 올랐습니다!",
    published_at: "2025-01-10T12:00:00Z",
    external_url: "https://threads.net/@aiartist/post/123",
    social_metadata: {
      authorHandle: "aiartist",
      likeCount: 4560,
      replyCount: 234,
      repostCount: 890,
      mediaUrls: [
        "https://picsum.photos/seed/th1/600/600",
        "https://picsum.photos/seed/th2/600/600",
      ],
    },
    author_info: {
      name: "AI 아티스트",
      handle: "aiartist",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=aiartist",
      verified: true,
    },
  },
  {
    id: "th-2",
    type: "threads",
    title: "일상 AI 활용팁",
    description:
      "ChatGPT로 하루를 시작하는 방법 🌅 매일 아침 오늘의 할 일을 정리하고, 우선순위를 정하는 프롬프트를 공유합니다. 생산성이 2배는 올라요!",
    published_at: "2025-01-09T07:00:00Z",
    external_url: "https://threads.net/@dailyai/post/456",
    social_metadata: {
      authorHandle: "dailyai",
      likeCount: 2890,
      replyCount: 178,
      repostCount: 445,
      mediaUrls: [],
    },
    author_info: {
      name: "일상 AI",
      handle: "dailyai",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=dailyai",
      verified: false,
    },
  },
  // GitHub
  {
    id: "gh-1",
    type: "open-source",
    title: "langchain-kr",
    description:
      "LangChain 한국어 튜토리얼 및 예제 코드 모음. 한국어로 작성된 상세한 설명과 실습 가능한 예제를 제공합니다.",
    published_at: "2025-01-09T00:00:00Z",
    external_url: "https://github.com/langchain-kr/langchain-kr",
    social_metadata: {
      repoOwner: "langchain-kr",
      repoName: "langchain-kr",
      language: "Python",
      languageColor: "#3572A5",
      stars: 4520,
      forks: 890,
      issues: 23,
      watchers: 156,
      topics: ["langchain", "llm", "korean", "tutorial"],
      lastUpdated: "2025-01-09T15:30:00Z",
    },
  },
  {
    id: "gh-2",
    type: "open-source",
    title: "local-llm-toolkit",
    description:
      "로컬에서 LLM을 쉽게 실행할 수 있는 올인원 툴킷. Ollama, LM Studio 등과 연동 가능하며 다양한 모델을 지원합니다.",
    published_at: "2025-01-08T00:00:00Z",
    external_url: "https://github.com/ai-tools/local-llm-toolkit",
    social_metadata: {
      repoOwner: "ai-tools",
      repoName: "local-llm-toolkit",
      language: "TypeScript",
      languageColor: "#2b7489",
      stars: 8920,
      forks: 1230,
      issues: 45,
      watchers: 234,
      topics: ["llm", "local-ai", "ollama", "toolkit"],
      lastUpdated: "2025-01-10T08:00:00Z",
    },
  },
  // Reddit
  {
    id: "rd-1",
    type: "reddit",
    title: "Claude가 GPT보다 코딩에서 더 나은 이유 (개인 경험)",
    description:
      "6개월간 두 모델을 번갈아 사용해본 결과, 복잡한 디버깅과 리팩토링에서는 Claude가 확실히 앞서는 것 같습니다. 특히 컨텍스트 이해력이...",
    published_at: "2025-01-10T06:00:00Z",
    external_url: "https://reddit.com/r/LocalLLaMA/comments/abc123",
    social_metadata: {
      subreddit: "LocalLLaMA",
      authorName: "llm_enthusiast",
      upvotes: 1890,
      downvotes: 120,
      commentCount: 342,
      awards: ["Gold", "Helpful"],
    },
    author_info: {
      name: "llm_enthusiast",
    },
  },
  {
    id: "rd-2",
    type: "reddit",
    title: "[공유] 무료로 사용 가능한 AI 코딩 도구 총정리 2025",
    description:
      "최근 출시된 무료 AI 코딩 도구들을 정리했습니다. Cursor, Continue, Cody 등 각 도구의 장단점을 비교 분석했어요.",
    published_at: "2025-01-09T14:00:00Z",
    external_url: "https://reddit.com/r/programming/comments/def456",
    thumbnail_url: "https://picsum.photos/seed/reddit1/640/360",
    social_metadata: {
      subreddit: "programming",
      authorName: "dev_tools_guru",
      upvotes: 3450,
      downvotes: 89,
      commentCount: 567,
      awards: ["Platinum", "Gold", "Silver"],
    },
    author_info: {
      name: "dev_tools_guru",
    },
  },
];

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // 데이터 fetch (병렬 실행)
  let featuredContent = [];
  let latestContent = [];

  try {
    [featuredContent, latestContent] = await Promise.all([
      fetchRecommendedContent(6).catch(() => []),
      fetchLatestByPlatform({ limitCount: 100 }).catch(() => []),
    ]);
  } catch (error) {
    console.error("Error fetching content:", error);
  }

  // Featured가 없으면 일반 featured 콘텐츠로 fallback
  if (featuredContent.length === 0) {
    try {
      featuredContent = await fetchFeaturedContent(6);
    } catch (error) {
      console.error("Error fetching featured content:", error);
    }
  }

  if (latestContent.length === 0) {
    latestContent = MOCK_LATEST_CONTENT;
  }

  featuredContent = await enrichContentWithThumbnails(featuredContent);

  return (
    <div className="container py-4 sm:py-6 md:py-8">
      {/* Hero Section */}
      <section className="mb-8 flex flex-col items-center text-center sm:mb-12 md:mb-16">
        <Badge className="mb-3 sm:mb-4" variant="secondary">
          {t("common.siteName")}
        </Badge>
        <h1 className="mb-3 font-cera text-2xl font-bold sm:mb-4 sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
          {t("home.hero.title")}
        </h1>
        <p className="mb-6 max-w-2xl text-base text-muted-foreground sm:mb-8 sm:text-lg">
          {t("home.hero.subtitle")}
        </p>
        <Link href="/content">
          <Button size="lg" className="min-h-[44px]">
            {t("home.hero.cta")}
            <FaArrowRight className="ml-2" />
          </Button>
        </Link>
      </section>

      {/* Featured Content Section */}
      <section className="mb-8 sm:mb-12 md:mb-16">
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between md:mb-8">
          <div>
            <h2 className="font-cera text-xl font-bold sm:text-2xl">
              {t("home.featured.title")}
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t("home.featured.subtitle")}
            </p>
          </div>
          <Link href="/content?featured=true">
            <Button
              variant="link"
              className="min-h-[44px] justify-start p-0 sm:justify-center sm:p-2"
            >
              {t("common.viewAll")}
              <FaArrowRight className="ml-2" size={12} />
            </Button>
          </Link>
        </div>
        <div className="scrollbar-hide relative -mx-4 overflow-x-auto overscroll-x-contain sm:mx-0">
          <div className="flex w-max gap-3 px-4 pb-4 sm:gap-4 sm:px-0">
            {featuredContent.length > 0
              ? featuredContent.map((content) => (
                  <div
                    key={content.id}
                    className="w-[280px] flex-shrink-0 sm:w-80 md:w-96"
                  >
                    <LinkPreviewCard
                      slug={content.slug}
                      title={content.title}
                      titleEn={content.title_en}
                      description={content.description}
                      descriptionEn={content.description_en}
                      category={content.category}
                      isPremium={content.is_premium}
                      thumbnailUrl={content.thumbnail_url}
                      externalUrl={content.external_url}
                      publishedAt={content.published_at}
                    />
                  </div>
                ))
              : [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-[280px] flex-shrink-0 sm:w-80 md:w-96"
                  >
                    <Card className="flex h-full flex-col">
                      <CardHeader>
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline">
                            <FaNewspaper className="mr-1" size={12} />
                            {t("contentTypes.article")}
                          </Badge>
                        </div>
                        <CardTitle className="line-clamp-2">
                          {locale === "ko"
                            ? `AI 트렌드 ${i}: 주목해야 할 기술`
                            : `AI Trend ${i}: Technologies to Watch`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {locale === "ko"
                            ? "최신 AI 기술 트렌드와 실무 적용 사례를 소개합니다."
                            : "Introducing the latest AI technology trends and practical applications."}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <NewsletterFeatured />

      {/* Latest Content Section (SNS Cards) */}
      <LatestContentSection
        content={latestContent}
        title={t("home.latest.title")}
        subtitle={t("home.latest.subtitle")}
      />

      {/* Categories Section */}
      <section className="mb-8 sm:mb-12 md:mb-16">
        <div className="mb-4 text-center sm:mb-6 md:mb-8">
          <h2 className="font-cera text-xl font-bold sm:text-2xl">
            {t("home.categories.title")}
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            {t("home.categories.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {categories.slice(0, 5).map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.id} href={`/content?category=${category.id}`}>
                <Card className="cursor-pointer hover:bg-accent">
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <Icon className="mb-2 h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">
                      {t(`categories.${category.id}`)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
