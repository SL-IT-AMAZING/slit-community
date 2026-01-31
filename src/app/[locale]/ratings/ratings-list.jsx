"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  FaStar,
  FaMagnifyingGlass,
  FaXmark,
  FaTrophy,
  FaGrip,
  FaList,
  FaArrowUpRightFromSquare,
} from "react-icons/fa6";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import RatingDistributionChart from "@/components/content/ratings/rating-distribution-chart";
import TagDistributionChart from "@/components/content/ratings/tag-distribution-chart";
import ToolDetailModal from "@/components/content/ratings/tool-detail-modal";

const TAGS = [
  "ui",
  "vibe-coding",
  "automation",
  "etc",
  "opensource",
  "methodology",
  "claude",
  "content-creation",
];

const TAG_COLORS = {
  ui: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "vibe-coding":
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  automation:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  etc: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  opensource:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  methodology: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  claude: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "content-creation":
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

const PRICING_STYLES = {
  free: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paid: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  freemium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function RatingsList({ initialTools, toolStats, locale }) {
  const t = useTranslations("ratings");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [sortBy, setSortBy] = useState("rating");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedTool, setSelectedTool] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredAndSortedTools = useMemo(() => {
    if (!initialTools) return [];

    let result = [...initialTools];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query),
      );
    }

    if (selectedTag) {
      result = result.filter((item) => item.tags?.includes(selectedTag));
    }

    result.sort((a, b) => {
      if (sortBy === "rating") {
        return (b.adminRating || 0) - (a.adminRating || 0);
      } else if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      } else if (sortBy === "recent") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });

    return result;
  }, [initialTools, searchQuery, selectedTag, sortBy]);

  const handleToolClick = (tool) => {
    setSelectedTool(tool);
    setModalOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTag(null);
    setSortBy("rating");
  };

  const hasActiveFilters = searchQuery || selectedTag || sortBy !== "rating";

  const leaderboard = useMemo(() => {
    if (!initialTools || !toolStats?.clickCounts) return [];

    return [...initialTools]
      .map((tool) => ({
        ...tool,
        clicks: toolStats.clickCounts[tool.id] || 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [initialTools, toolStats]);

  const translatedTagDistribution = useMemo(() => {
    if (!toolStats?.tagDistribution) return [];
    return toolStats.tagDistribution.map((item) => ({
      ...item,
      tagKey: item.tag,
      tag: t(`tags.${item.tag}`) || item.tag,
    }));
  }, [toolStats, t]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden border-b bg-muted/20">
        <div className="container relative py-10 lg:py-14">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <img
              src="/images/homer.png"
              alt="Homer"
              className="h-20 w-20 rounded-full object-cover shadow-lg"
            />
            <div className="text-center sm:text-left">
              <h1 className="mb-2 text-3xl font-black tracking-tight sm:text-4xl">
                {t("heroTitle")}
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                {t("heroSubtitle")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">
              {t("charts.ratingDistribution")}
            </h3>
            <RatingDistributionChart
              data={toolStats?.ratingDistribution || []}
              width={260}
            />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">
              {t("charts.tagDistribution")}
            </h3>
            <TagDistributionChart data={translatedTagDistribution} size={160} />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">
              {t("charts.leaderboard")}
            </h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((tool, index) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="truncate">{tool.name}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {tool.clicks} clicks
                  </span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedTag === tag
                  ? TAG_COLORS[tag]
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t(`tags.${tag}`)}
            </button>
          ))}
        </div>

        <div className="sticky top-4 z-30 mb-6 rounded-xl border bg-card/80 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-md">
              <FaMagnifyingGlass
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
              />
              <Input
                placeholder={t("filters.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t("filters.sortBy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">
                    {t("filters.sortByRating")}
                  </SelectItem>
                  <SelectItem value="recent">
                    {t("filters.sortByRecent")}
                  </SelectItem>
                  <SelectItem value="name">
                    {t("filters.sortByName")}
                  </SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <FaXmark size={16} />
                </Button>
              )}

              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-2 transition-colors ${
                    viewMode === "grid"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FaGrip size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-2 transition-colors ${
                    viewMode === "list"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FaList size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {filteredAndSortedTools.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAndSortedTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className="group cursor-pointer rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  {tool.thumbnailUrl && (
                    <div className="mb-3 overflow-hidden rounded-lg">
                      <img
                        src={tool.thumbnailUrl}
                        alt={tool.name}
                        className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  )}

                  <h3 className="mb-2 line-clamp-1 font-semibold">
                    {tool.name}
                  </h3>

                  <div className="mb-2 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        size={12}
                        className={
                          i < (tool.adminRating || 0)
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1">
                    {(tool.tags || []).slice(0, 2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {t(`tags.${tag}`) || tag}
                      </Badge>
                    ))}
                    {tool.pricing && (
                      <Badge
                        className={`text-[10px] ${PRICING_STYLES[tool.pricing]}`}
                      >
                        {t(`pricing.${tool.pricing}`)}
                      </Badge>
                    )}
                  </div>

                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {locale === "en" && tool.descriptionEn
                      ? tool.descriptionEn
                      : tool.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className="group flex cursor-pointer items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  {tool.thumbnailUrl && (
                    <img
                      src={tool.thumbnailUrl}
                      alt={tool.name}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{tool.name}</h3>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            size={10}
                            className={
                              i < (tool.adminRating || 0)
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {locale === "en" && tool.descriptionEn
                        ? tool.descriptionEn
                        : tool.description}
                    </p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    {(tool.tags || []).slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {t(`tags.${tag}`) || tag}
                      </Badge>
                    ))}
                    {tool.pricing && (
                      <Badge
                        className={`text-xs ${PRICING_STYLES[tool.pricing]}`}
                      >
                        {t(`pricing.${tool.pricing}`)}
                      </Badge>
                    )}
                  </div>

                  <FaArrowUpRightFromSquare
                    size={14}
                    className="shrink-0 text-muted-foreground"
                  />
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
            <FaMagnifyingGlass
              className="mb-4 text-muted-foreground"
              size={24}
            />
            <h3 className="text-lg font-semibold">{t("noResults")}</h3>
            <p className="mb-4 text-muted-foreground">
              Try adjusting your filters or search terms.
            </p>
            <Button onClick={clearFilters} variant="outline">
              {t("filters.clear")}
            </Button>
          </div>
        )}
      </div>

      <ToolDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tool={selectedTool}
        locale={locale}
      />
    </div>
  );
}
