"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";

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
import ContentCard from "@/components/content/content-card";

import { FaMagnifyingGlass, FaFilter, FaXmark } from "react-icons/fa6";

const contentTypes = ["article", "video", "open-source", "news", "x-thread", "linkedin", "threads", "reddit"];
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

export default function ContentList({ initialContent, locale, initialType = null }) {
  const t = useTranslations();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState(initialType ? [initialType] : []);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  // New filter states
  const [premiumFilter, setPremiumFilter] = useState(null); // null | true | false
  const [dateRange, setDateRange] = useState("all"); // "week" | "month" | "3months" | "all"
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "popular"

  const filteredContent = useMemo(() => {
    let result = initialContent.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = (locale === "en" && item.titleEn ? item.titleEn : item.title || "").toLowerCase();
        const description = (locale === "en" && item.descriptionEn ? item.descriptionEn : item.description || "").toLowerCase();
        if (!title.includes(query) && !description.includes(query)) {
          return false;
        }
      }

      // Type filter (multiple selection)
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) {
        return false;
      }

      // Category filter (multiple selection)
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
        return false;
      }

      // Premium/Free filter
      if (premiumFilter !== null && item.isPremium !== premiumFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== "all") {
        const minDate = getDateRangeFilter(dateRange);
        if (minDate && new Date(item.publishedAt) < minDate) {
          return false;
        }
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "popular") {
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
      // Default: newest
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    return result;
  }, [initialContent, searchQuery, selectedTypes, selectedCategories, premiumFilter, dateRange, sortBy, locale]);

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

  const hasActiveFilters = selectedTypes.length > 0 || selectedCategories.length > 0 || searchQuery || premiumFilter !== null || dateRange !== "all";

  const activeFilterCount =
    selectedTypes.length +
    selectedCategories.length +
    (premiumFilter !== null ? 1 : 0) +
    (dateRange !== "all" ? 1 : 0);

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
            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              type="text"
              placeholder={t("content.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort Select */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder={t("content.filters.sort")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("content.filters.newest")}</SelectItem>
              <SelectItem value="popular">{t("content.filters.popular")}</SelectItem>
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
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">
                {t("content.filters.button")}
              </span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <FaXmark className="mr-1" size={12} />
                  {t("content.filters.clear")}
                </Button>
              )}
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* Content Type Filter */}
              <div>
                <span className="mb-2 block text-sm font-medium">
                  {t("content.filters.contentType")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {contentTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={selectedTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedTypes(prev =>
                        prev.includes(type)
                          ? prev.filter(t => t !== type)
                          : [...prev, type]
                      )}
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
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategories(prev =>
                        prev.includes(category)
                          ? prev.filter(c => c !== category)
                          : [...prev, category]
                      )}
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
                    <SelectItem value="all">{t("content.filters.allTime")}</SelectItem>
                    <SelectItem value="week">{t("content.filters.lastWeek")}</SelectItem>
                    <SelectItem value="month">{t("content.filters.lastMonth")}</SelectItem>
                    <SelectItem value="3months">{t("content.filters.last3Months")}</SelectItem>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredContent.map((item) => (
            <ContentCard
              key={item.id}
              slug={item.slug}
              title={item.title}
              titleEn={item.titleEn}
              description={item.description}
              descriptionEn={item.descriptionEn}
              type={item.type}
              category={item.category}
              isPremium={item.isPremium}
              viewCount={item.viewCount}
              thumbnailUrl={item.thumbnailUrl}
              publishedAt={item.publishedAt}
              isBookmarked={bookmarkedIds.has(item.id)}
              onBookmarkToggle={() => handleBookmarkToggle(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border py-16">
          <p className="mb-4 text-muted-foreground">
            {t("content.noResults")}
          </p>
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
