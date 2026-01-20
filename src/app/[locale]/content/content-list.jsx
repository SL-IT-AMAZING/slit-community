"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";

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
import { SocialCardRenderer } from "@/components/content/social-cards";
import ContentCard from "@/components/content/content-card";

import {
  FaMagnifyingGlass,
  FaFilter,
  FaXmark,
  FaGrip,
  FaList,
  FaBars,
} from "react-icons/fa6";

const contentTypes = [
  "article",
  "video",
  "open-source",
  "news",
  "x-thread",
  "linkedin",
  "threads",
  "reddit",
];

const categories = [
  "ai-basics",
  "llm",
  "image-generation",
  "ai-tools",
  "claude-code",
  "industry-trends",
  "open-source",
  "ai-monetization",
  "research-papers",
];

// 타입을 플랫폼으로 매핑
const TYPE_TO_PLATFORM = {
  video: "youtube",
  "x-thread": "x",
  linkedin: "linkedin",
  threads: "threads",
  "open-source": "github",
  reddit: "reddit",
};

const getDateRangeFilter = (range) => {
  const now = new Date();
  switch (range) {
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "3months":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
};

export default function ContentList({
  initialContent,
  locale,
  initialType = null,
}) {
  const t = useTranslations();
  const currentLocale = useLocale();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState(
    initialType ? [initialType] : [],
  );
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  const [premiumFilter, setPremiumFilter] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");

  const filteredContent = useMemo(() => {
    let result = initialContent.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = (
          currentLocale === "en" && item.title_en
            ? item.title_en
            : item.title || ""
        ).toLowerCase();
        const description = (
          currentLocale === "en" && item.description_en
            ? item.description_en
            : item.description || ""
        ).toLowerCase();
        if (!title.includes(query) && !description.includes(query)) {
          return false;
        }
      }

      // Type filter (multiple selection)
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) {
        return false;
      }

      // Category filter (multiple selection)
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(item.category)
      ) {
        return false;
      }

      // Premium/Free filter
      if (premiumFilter !== null && item.is_premium !== premiumFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== "all") {
        const minDate = getDateRangeFilter(dateRange);
        if (minDate && new Date(item.published_at) < minDate) {
          return false;
        }
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "popular") {
        return (b.view_count || 0) - (a.view_count || 0);
      }
      // Default: newest
      return new Date(b.published_at) - new Date(a.published_at);
    });

    return result;
  }, [
    initialContent,
    searchQuery,
    selectedTypes,
    selectedCategories,
    premiumFilter,
    dateRange,
    sortBy,
    currentLocale,
  ]);

  const handleBookmarkToggle = (id) => {
    setBookmarkedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSearchQuery("");
    setPremiumFilter(null);
    setDateRange("all");
    setSortBy("newest");
  };

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedCategories.length > 0 ||
    searchQuery ||
    premiumFilter !== null ||
    dateRange !== "all";

  const activeFilterCount =
    selectedTypes.length +
    selectedCategories.length +
    (premiumFilter !== null ? 1 : 0) +
    (dateRange !== "all" ? 1 : 0);

  const isSocialPlatform = (type) => {
    return TYPE_TO_PLATFORM[type] !== undefined;
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 font-cera text-3xl font-bold">
          {t("content.hub.title")}
        </h1>
        <p className="text-muted-foreground">{t("content.hub.subtitle")}</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search Input */}
          <div className="relative flex-1">
            <FaMagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
            <Input
              type="text"
              placeholder={t("content.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex shrink-0 gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid view"
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
              title="List view"
            >
              <FaList size={14} />
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`rounded-md p-2 transition-colors ${
                viewMode === "compact"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Compact view"
            >
              <FaBars size={14} />
            </button>
          </div>

          {/* Sort Select */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder={t("content.filters.sort")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                {t("content.filters.newest")}
              </SelectItem>
              <SelectItem value="popular">
                {t("content.filters.popular")}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <FaFilter size={14} />
            {t("content.filters.button")}
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs text-primary">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-medium">{t("content.filters.button")}</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <FaXmark className="mr-1" size={12} />
                  {t("content.filters.clear")}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Content Type Filter */}
              <div>
                <span className="mb-2 block text-sm font-medium">
                  {t("content.filters.contentType")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {contentTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={
                        selectedTypes.includes(type) ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedTypes((prev) =>
                          prev.includes(type)
                            ? prev.filter((t) => t !== type)
                            : [...prev, type],
                        )
                      }
                    >
                      {t(`contentTypes.${type}`)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <span className="mb-2 block text-sm font-medium">
                  {t("content.filters.category")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={
                        selectedCategories.includes(category)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedCategories((prev) =>
                          prev.includes(category)
                            ? prev.filter((c) => c !== category)
                            : [...prev, category],
                        )
                      }
                    >
                      {t(`categories.${category}`)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Premium/Free Filter */}
              <div>
                <span className="mb-2 block text-sm font-medium">
                  {t("content.filters.access")}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={premiumFilter === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setPremiumFilter(null)}
                  >
                    {t("content.filters.all")}
                  </Badge>
                  <Badge
                    variant={premiumFilter === false ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setPremiumFilter(false)}
                  >
                    {t("content.free")}
                  </Badge>
                  <Badge
                    variant={premiumFilter === true ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setPremiumFilter(true)}
                  >
                    {t("content.premium")}
                  </Badge>
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <span className="mb-2 block text-sm font-medium">
                  {t("content.filters.dateRange")}
                </span>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("content.filters.allTime")}
                    </SelectItem>
                    <SelectItem value="week">
                      {t("content.filters.lastWeek")}
                    </SelectItem>
                    <SelectItem value="month">
                      {t("content.filters.lastMonth")}
                    </SelectItem>
                    <SelectItem value="3months">
                      {t("content.filters.last3Months")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-muted-foreground">
        {t("content.resultsCount", { count: filteredContent.length })}
      </div>

      {/* Content Grid */}
      {filteredContent.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              : viewMode === "list"
                ? "flex flex-col gap-4"
                : "flex flex-col gap-2"
          }
        >
          {filteredContent.map((item) => {
            if (isSocialPlatform(item.type)) {
              return (
                <SocialCardRenderer
                  key={item.id}
                  content={item}
                  variant={viewMode}
                />
              );
            }

            return (
              <ContentCard
                key={item.id}
                variant={viewMode}
                slug={item.slug}
                title={item.title}
                titleEn={item.title_en}
                description={item.description}
                descriptionEn={item.description_en}
                type={item.type}
                category={item.category}
                isPremium={item.is_premium}
                viewCount={item.view_count}
                thumbnailUrl={item.thumbnail_url}
                publishedAt={item.published_at}
                isBookmarked={bookmarkedIds.has(item.id)}
                onBookmarkToggle={() => handleBookmarkToggle(item.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border py-16">
          <p className="mb-4 text-muted-foreground">{t("content.noResults")}</p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              {t("content.filters.clearFilters")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
