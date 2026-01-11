import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import { Card, CardContent } from "@/components/ui/card";

import {
  FaRobot,
  FaBrain,
  FaLightbulb,
  FaCode,
  FaGraduationCap,
  FaChartLine,
  FaBook,
  FaCoins,
  FaFlask,
} from "react-icons/fa6";

const categories = [
  { id: "ai-basics", icon: FaRobot, count: 24 },
  { id: "llm", icon: FaBrain, count: 56 },
  { id: "image-generation", icon: FaLightbulb, count: 32 },
  { id: "ai-tools", icon: FaCode, count: 48 },
  { id: "claude-code", icon: FaGraduationCap, count: 67 },
  { id: "industry-trends", icon: FaChartLine, count: 41 },
  { id: "open-source", icon: FaCode, count: 29 },
  { id: "ai-monetization", icon: FaCoins, count: 18 },
  { id: "research-papers", icon: FaFlask, count: 35 },
];

export default function CategoriesPage({ params }) {
  setRequestLocale(params.locale);
  const t = useTranslations();

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-cera text-3xl font-bold">
          {t("home.categories.title")}
        </h1>
        <p className="text-muted-foreground">{t("home.categories.subtitle")}</p>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
            >
              <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {t(`categories.${category.id}`)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.count} {params.locale === "ko" ? "개의 콘텐츠" : "contents"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
