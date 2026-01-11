import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  FaArrowUpRightFromSquare,
  FaStar,
  FaCode,
  FaPalette,
  FaRobot,
  FaBolt,
  FaLaptopCode,
  FaWandMagicSparkles,
} from "react-icons/fa6";

const CURATED_SITES = [
  {
    id: "1",
    name: "v0.dev",
    nameKo: "v0.dev",
    description: "Vercel's AI-powered UI generation tool",
    descriptionKo: "Vercel의 AI 기반 UI 생성 도구",
    url: "https://v0.dev",
    icon: FaPalette,
    tags: ["UI", "React", "Tailwind"],
    featured: true,
  },
  {
    id: "2",
    name: "Cursor",
    nameKo: "Cursor",
    description: "AI-powered code editor for fast development",
    descriptionKo: "빠른 개발을 위한 AI 코드 에디터",
    url: "https://cursor.com",
    icon: FaLaptopCode,
    tags: ["IDE", "AI Coding"],
    featured: true,
  },
  {
    id: "3",
    name: "Bolt.new",
    nameKo: "Bolt.new",
    description: "AI full-stack app generator with instant deploy",
    descriptionKo: "즉시 배포 가능한 AI 풀스택 앱 생성기",
    url: "https://bolt.new",
    icon: FaBolt,
    tags: ["Full-stack", "Deploy"],
    featured: true,
  },
  {
    id: "4",
    name: "Lovable",
    nameKo: "Lovable",
    description: "AI app builder for non-developers",
    descriptionKo: "비개발자를 위한 AI 앱 빌더",
    url: "https://lovable.dev",
    icon: FaWandMagicSparkles,
    tags: ["No-code", "App Builder"],
    featured: false,
  },
  {
    id: "5",
    name: "Replit",
    nameKo: "Replit",
    description: "Collaborative AI coding environment",
    descriptionKo: "협업 가능한 AI 코딩 환경",
    url: "https://replit.com",
    icon: FaCode,
    tags: ["IDE", "Collaboration"],
    featured: false,
  },
  {
    id: "6",
    name: "Claude",
    nameKo: "Claude",
    description: "Anthropic's AI assistant for coding and analysis",
    descriptionKo: "코딩과 분석을 위한 Anthropic AI 어시스턴트",
    url: "https://claude.ai",
    icon: FaRobot,
    tags: ["LLM", "Assistant"],
    featured: true,
  },
];

export default function HomerPage({ params }) {
  setRequestLocale(params.locale);
  const t = useTranslations();
  const locale = params.locale;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <img
          src="/images/homer.png"
          alt="Homer"
          className="h-16 w-16 rounded-full object-cover"
        />
        <div>
          <h1 className="mb-1 font-cera text-3xl font-bold">{t("homer.title")}</h1>
          <p className="text-muted-foreground">{t("homer.subtitle")}</p>
        </div>
      </div>

      {/* Sites Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CURATED_SITES.map((site) => {
          const Icon = site.icon;
          return (
            <Card
              key={site.id}
              className="group transition-all hover:border-primary hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">
                      {locale === "ko" ? site.nameKo : site.name}
                    </CardTitle>
                  </div>
                  {site.featured && (
                    <Badge variant="secondary" className="gap-1">
                      <FaStar size={10} />
                      {t("homer.featured")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {locale === "ko" ? site.descriptionKo : site.description}
                </p>
                <div className="mb-4 flex flex-wrap gap-1">
                  {site.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    {t("homer.visit")}
                    <FaArrowUpRightFromSquare size={12} />
                  </Button>
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
