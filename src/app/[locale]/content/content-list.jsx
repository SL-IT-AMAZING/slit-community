"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ContentCard from "@/components/content/content-card";

import { FaMagnifyingGlass, FaFilter, FaXmark } from "react-icons/fa6";

const contentTypes = ["article", "video", "open-source", "news", "x-thread", "linkedin", "threads", "reddit"];
const categories = [
  "ai-basics",
  "llm",
  "image-generation",
  "ai-tools",
  "tutorials",
  "industry-trends",
  "open-source",
  "ai-monetization",
  "research-papers",
];

export default function ContentList({ initialContent, locale, initialType = null }) {
  const t = useTranslations();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  const filteredContent = useMemo(() => {
    return initialContent.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = (locale === "en" && item.titleEn ? item.titleEn : item.title || "").toLowerCase();
        const description = (locale === "en" && item.descriptionEn ? item.descriptionEn : item.description || "").toLowerCase();
        if (!title.includes(query) && !description.includes(query)) {
          return false;
        }
      }

      // Type filter
      if (selectedType && item.type !== selectedType) {
        return false;
      }

      // Category filter
      if (selectedCategory && item.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [initialContent, searchQuery, selectedType, selectedCategory, locale]);

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
    setSelectedType(null);
    setSelectedCategory(null);
    setSearchQuery("");
  };

  const hasActiveFilters = selectedType || selectedCategory || searchQuery;

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

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <FaFilter size={14} />
            {t("content.filters.button")}
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs text-primary">
                {(selectedType ? 1 : 0) + (selectedCategory ? 1 : 0)}
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

            {/* Content Type Filter */}
            <div className="mb-4">
              <span className="mb-2 block text-sm font-medium">
                {t("content.filters.contentType")}
              </span>
              <div className="flex flex-wrap gap-2">
                {contentTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
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
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  >
                    {t(`categories.${category}`)}
                  </Badge>
                ))}
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
