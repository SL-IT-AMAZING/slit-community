"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  FaGithub,
  FaStar,
  FaCodeBranch,
  FaMagnifyingGlass,
  FaFilter,
  FaXmark,
  FaTrophy,
  FaArrowUpRightFromSquare,
  FaGrip,
  FaList,
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
import DetailModal from "@/components/content/social-cards/detail-modal";

// Language colors from github-card.jsx
const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Vue: "#41b883",
  Jupyter: "#DA5B0B",
};

const getRankStyle = (rank) => {
  switch (rank) {
    case 1:
      return "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
    case 2:
      return "text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]";
    case 3:
      return "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]";
    default:
      return "text-muted-foreground/50";
  }
};

export default function OpensourceList({ initialContent, languages, locale }) {
  const t = useTranslations("opensource");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [sortBy, setSortBy] = useState("stars");
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleItemClick = (item, e) => {
    if (e.target.closest("a") || e.target.closest("button")) return;

    const githubMatch = item.externalUrl?.match(
      /github\.com\/([^/]+)\/([^/]+)/,
    );
    const repoOwner = githubMatch?.[1] || "Unknown";
    const repoName = githubMatch?.[2] || "Untitled";
    const metadata = item.socialMetadata || {};
    const digestResult = metadata.digest_result || {};

    const modalData = {
      repoOwner,
      repoName,
      description: item.description,
      language: metadata.language,
      stars: metadata.stars || 0,
      forks: metadata.forks || 0,
      topics: [],
      externalUrl: item.externalUrl,
      readmeImageUrl: item.readmeImageUrl || metadata.screenshotUrl,
      starHistoryUrl: metadata.star_history_screenshot,
      trendshiftBadgeUrl: metadata.trendshift_badge_url,
      trendshiftRank: metadata.trendshift_badge_rank,
      llmSummary: {
        summary: digestResult.tagline,
        features: digestResult.features || [],
        use_cases: digestResult.use_cases || [],
        beginner_description: `${digestResult.competitor || ""}을 대체할 수 있는 오픈소스입니다.`,
        killer_feature: digestResult.killer_feature,
      },
      translatedContent: metadata.translatedContent,
    };

    setSelectedItem(modalData);
    setModalOpen(true);
  };

  // Filter and Sort Logic
  const filteredAndSortedContent = useMemo(() => {
    if (!initialContent) return [];

    let result = [...initialContent];

    // 1. Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const githubMatch = item.externalUrl?.match(
          /github\.com\/([^/]+)\/([^/]+)/,
        );
        const name = (githubMatch?.[2] || item.title || "").toLowerCase();
        const owner = (githubMatch?.[1] || "").toLowerCase();
        const desc = (
          item.socialMetadata?.digest_result?.tagline ||
          item.description ||
          ""
        ).toLowerCase();
        return (
          name.includes(query) || owner.includes(query) || desc.includes(query)
        );
      });
    }

    // 2. Language Filter
    if (selectedLanguage !== "all") {
      result = result.filter(
        (item) => item.socialMetadata?.language === selectedLanguage,
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      const aData = a.socialMetadata || {};
      const bData = b.socialMetadata || {};

      if (sortBy === "stars") {
        return (bData.stars || 0) - (aData.stars || 0);
      } else if (sortBy === "forks") {
        return (bData.forks || 0) - (aData.forks || 0);
      } else if (sortBy === "recent") {
        return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
      }
      return 0;
    });

    return result;
  }, [initialContent, searchQuery, selectedLanguage, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLanguage("all");
    setSortBy("stars");
  };

  const hasActiveFilters =
    searchQuery || selectedLanguage !== "all" || sortBy !== "stars";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b bg-muted/20">
        <div className="bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] absolute inset-0 bg-[bottom_1px_center]" />
        <div className="container relative py-16 text-center lg:py-24">
          <Badge
            variant="outline"
            className="animate-fade-in mb-4 bg-background/50 backdrop-blur"
          >
            <FaTrophy className="mr-2 text-yellow-500" size={12} />
            {t("title")}
          </Badge>
          <h1 className="mb-4 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {t("heroSubtitle")}
          </p>
        </div>
      </div>

      <div className="container py-8">
        {/* Controls Bar */}
        <div className="sticky top-4 z-30 mb-8 rounded-xl border bg-card/80 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 md:max-w-md">
              <FaMagnifyingGlass
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
              />
              <Input
                placeholder={
                  t("filters.searchPlaceholder") || "Search repositories..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-muted bg-background/50 pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Language Select */}
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger className="w-[160px] border-muted bg-background/50">
                  <SelectValue placeholder={t("filters.language")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("filters.allLanguages")}
                  </SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang.name} value={lang.name}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              LANGUAGE_COLORS[lang.name] || "#888",
                          }}
                        />
                        {lang.name}
                        <span className="ml-auto text-xs text-muted-foreground">
                          ({lang.count})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort Select */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] border-muted bg-background/50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stars">
                    <div className="flex items-center gap-2">
                      <FaStar size={12} /> Stars
                    </div>
                  </SelectItem>
                  <SelectItem value="forks">
                    <div className="flex items-center gap-2">
                      <FaCodeBranch size={12} /> Forks
                    </div>
                  </SelectItem>
                  <SelectItem value="recent">
                    <div className="flex items-center gap-2">
                      <FaFilter size={12} /> Recent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  className="h-10 w-10 text-muted-foreground hover:text-foreground"
                  title={t("filters.clear")}
                >
                  <FaXmark size={16} />
                </Button>
              )}

              <div className="flex gap-1 rounded-lg bg-muted p-1">
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
              </div>
            </div>
          </div>
        </div>

        {filteredAndSortedContent.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedContent.map((item, index) => {
                const rank = index + 1;
                const { socialMetadata, externalUrl, description, title } =
                  item;
                const githubMatch = externalUrl?.match(
                  /github\.com\/([^/]+)\/([^/]+)/,
                );
                const repoOwner = githubMatch?.[1] || "Unknown";
                const repoName = githubMatch?.[2] || "Untitled";
                const stars = socialMetadata?.stars || 0;
                const forks = socialMetadata?.forks || 0;
                const lang = socialMetadata?.language;
                const desc =
                  socialMetadata?.translatedContent?.split("\n")[0] ||
                  socialMetadata?.digest_result?.tagline ||
                  description ||
                  title ||
                  "No description available.";
                const link =
                  externalUrl || `https://github.com/${repoOwner}/${repoName}`;

                return (
                  <div
                    key={item.id || index}
                    onClick={(e) => handleItemClick(item, e)}
                    className="group relative flex cursor-pointer flex-col rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center text-xl font-black ${getRankStyle(rank)}`}
                      >
                        {rank}
                      </div>
                      {lang && (
                        <Badge variant="secondary" className="h-5 text-[10px]">
                          <span
                            className="mr-1.5 h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: LANGUAGE_COLORS[lang] || "#888",
                            }}
                          />
                          {lang}
                        </Badge>
                      )}
                    </div>

                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 line-clamp-1 font-semibold text-foreground hover:text-primary"
                    >
                      <span className="font-normal text-muted-foreground">
                        {repoOwner}/
                      </span>
                      {repoName}
                    </a>

                    <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">
                      {desc}
                    </p>

                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <FaStar className="text-yellow-500" size={12} />
                          <span className="font-medium">
                            {stars.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FaCodeBranch size={12} />
                          <span>{forks.toLocaleString()}</span>
                        </div>
                      </div>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition-colors hover:text-primary"
                      >
                        <FaGithub size={18} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedContent.map((item, index) => {
                const rank = index + 1;
                const { socialMetadata, externalUrl, description, title } =
                  item;
                const githubMatch = externalUrl?.match(
                  /github\.com\/([^/]+)\/([^/]+)/,
                );
                const repoOwner = githubMatch?.[1] || "Unknown";
                const repoName = githubMatch?.[2] || "Untitled";
                const stars = socialMetadata?.stars || 0;
                const forks = socialMetadata?.forks || 0;
                const lang = socialMetadata?.language;
                const desc =
                  socialMetadata?.translatedContent?.split("\n")[0] ||
                  socialMetadata?.digest_result?.tagline ||
                  description ||
                  title ||
                  "No description available.";
                const link =
                  externalUrl || `https://github.com/${repoOwner}/${repoName}`;

                return (
                  <div
                    key={item.id || index}
                    onClick={(e) => handleItemClick(item, e)}
                    className="group relative flex cursor-pointer flex-col gap-4 rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center text-2xl font-black ${getRankStyle(rank)}`}
                      >
                        {rank}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link flex items-center gap-1.5 font-semibold text-foreground hover:text-primary sm:text-lg"
                          >
                            <span className="font-normal text-muted-foreground">
                              {repoOwner} /
                            </span>
                            {repoName}
                          </a>
                          <Badge
                            variant="secondary"
                            className="hidden h-5 text-[10px] font-normal sm:inline-flex"
                          >
                            {lang}
                          </Badge>
                        </div>

                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground sm:w-3/4">
                          {desc}
                        </p>

                        <div className="mt-3 flex items-center gap-4 text-xs font-medium text-muted-foreground sm:hidden">
                          <div className="flex items-center gap-1">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  LANGUAGE_COLORS[lang] || "#888",
                              }}
                            />
                            {lang}
                          </div>
                          <div className="flex items-center gap-1">
                            <FaStar className="text-yellow-500" />
                            {stars.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <FaCodeBranch />
                            {forks.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden shrink-0 items-center gap-6 sm:flex">
                      {lang && (
                        <div
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                          title="Language"
                        >
                          <span
                            className="h-3 w-3 rounded-full shadow-sm"
                            style={{
                              backgroundColor: LANGUAGE_COLORS[lang] || "#888",
                            }}
                          />
                        </div>
                      )}

                      <div className="flex w-20 flex-col items-end">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <FaStar
                            className="mb-0.5 text-yellow-500"
                            size={14}
                          />
                          {stars.toLocaleString()}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Stars
                        </span>
                      </div>

                      <div className="flex w-16 flex-col items-end">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <FaCodeBranch
                            className="mb-0.5 text-muted-foreground"
                            size={14}
                          />
                          {forks.toLocaleString()}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Forks
                        </span>
                      </div>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-2 transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FaGithub size={16} />
                          <span className="hidden lg:inline">
                            {t("viewOnGithub")}
                          </span>
                          <FaArrowUpRightFromSquare
                            size={10}
                            className="lg:hidden"
                          />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <FaMagnifyingGlass className="text-muted-foreground" size={24} />
            </div>
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

      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        platform="github"
        data={selectedItem}
      />
    </div>
  );
}
