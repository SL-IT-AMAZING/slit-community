"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  FaGithub,
  FaStar,
  FaCodeBranch,
  FaCircleExclamation,
  FaEye,
  FaScaleBalanced,
  FaChartLine,
} from "react-icons/fa6";

import BaseSocialCard, {
  MetricItem,
  formatRelativeTime,
  ImageLightbox,
} from "./base-social-card";
import DetailModal from "./detail-modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// 언어별 색상 (GitHub 기준)
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

export default function GitHubCard({
  repoOwner,
  repoName,
  description,
  language,
  languageColor,
  stars,
  forks,
  issues,
  watchers,
  topics = [],
  lastUpdated,
  readmeImageUrl,
  externalUrl,
  metricsHistory = [],
  className,
  // 새로운 props
  trendshiftBadgeUrl,
  trendshiftRank,
  trendshiftRepoId,
  licenseType,
  starHistoryUrl,
  // LLM 요약 정보
  llmSummary,
}) {
  const locale = useLocale();
  const langColor = languageColor || LANGUAGE_COLORS[language] || "#586069";

  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const contentRef = useRef(null);

  const MAX_HEIGHT = 80; // description 최대 높이

  // 설명 텍스트 결정
  const displayDescription = llmSummary?.summary || description;

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > MAX_HEIGHT);
    }
  }, [displayDescription]);

  const modalData = {
    repoOwner,
    repoName,
    description,
    language,
    languageColor,
    stars,
    forks,
    issues,
    watchers,
    topics,
    lastUpdated,
    readmeImageUrl,
    externalUrl: externalUrl || `https://github.com/${repoOwner}/${repoName}`,
    metricsHistory,
    trendshiftBadgeUrl,
    trendshiftRank,
    trendshiftRepoId,
    licenseType,
    starHistoryUrl,
    llmSummary,
  };

  return (
    <>
      <BaseSocialCard
        platform="github"
        platformIcon={FaGithub}
        externalUrl={
          externalUrl || `https://github.com/${repoOwner}/${repoName}`
        }
        className={className}
      >
        {/* Repo Name */}
        <div className="flex items-center gap-2">
          <FaGithub size={20} className="text-muted-foreground" />
          <a
            href={externalUrl || `https://github.com/${repoOwner}/${repoName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm font-semibold hover:text-primary hover:underline"
          >
            <span className="text-muted-foreground">{repoOwner}/</span>
            {repoName}
          </a>
        </div>

        {/* LLM Summary or Description with Show More */}
        {displayDescription && (
          <div className="relative mt-2">
            <div
              ref={contentRef}
              className={`transition-all ${
                !expanded && isOverflowing ? "max-h-[80px] overflow-hidden" : ""
              }`}
            >
              {llmSummary?.summary ? (
                <>
                  <p className="text-sm text-foreground">
                    {llmSummary.summary}
                  </p>
                  {llmSummary.features && llmSummary.features.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {llmSummary.features.slice(0, 3).map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  {llmSummary.beginner_description && (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      💡 {llmSummary.beginner_description}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {/* 그라데이션 + 더보기 버튼 */}
            {isOverflowing && !expanded && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card to-transparent pt-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(true);
                  }}
                  className="min-h-[44px] px-2 py-1 text-xs font-medium text-primary hover:underline"
                >
                  {locale === "ko" ? "더보기" : "Show more"}
                </button>
              </div>
            )}
            {/* 접기 버튼 */}
            {expanded && isOverflowing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(false);
                }}
                className="mt-1 min-h-[44px] px-2 py-1 text-xs font-medium text-primary hover:underline"
              >
                {locale === "ko" ? "접기" : "Show less"}
              </button>
            )}
          </div>
        )}

        {/* README Image (스크린샷 - GitHub만) - 클릭하면 확대 */}
        {readmeImageUrl && (
          <div
            className="mt-3 cursor-pointer overflow-hidden rounded-base border-2 border-border transition-opacity hover:opacity-90"
            onClick={(e) => {
              e.stopPropagation();
              setImageLightboxOpen(true);
            }}
          >
            <img
              src={readmeImageUrl}
              alt={`${repoName} preview`}
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Topics */}
        {topics && topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {topics.slice(0, 5).map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className="text-xs font-normal"
              >
                {topic}
              </Badge>
            ))}
            {topics.length > 5 && (
              <Badge variant="secondary" className="text-xs font-normal">
                +{topics.length - 5}
              </Badge>
            )}
          </div>
        )}

        {/* Language & Metrics */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          {language && (
            <span className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: langColor }}
              />
              {language}
            </span>
          )}
          <MetricItem icon={FaStar} value={stars} label="Stars" />
          <MetricItem icon={FaCodeBranch} value={forks} label="Forks" />
          {issues !== undefined && (
            <MetricItem
              icon={FaCircleExclamation}
              value={issues}
              label="Issues"
            />
          )}
          {trendshiftRank && (
            <span className="flex items-center gap-1 text-purple-500">
              <FaChartLine size={14} />
              <span className="font-medium">#{trendshiftRank}</span>
            </span>
          )}
        </div>

        {/* License Badge */}
        {licenseType && (
          <div className="mt-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <FaScaleBalanced size={10} />
              {licenseType}
            </Badge>
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <p className="mt-2 text-xs text-muted-foreground">
            {locale === "ko" ? "업데이트" : "Updated"}{" "}
            {formatRelativeTime(lastUpdated, locale)}
          </p>
        )}
      </BaseSocialCard>

      {/* Detail Modal */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        platform="github"
        data={modalData}
      />

      {/* Image Lightbox */}
      {readmeImageUrl && (
        <ImageLightbox
          images={[readmeImageUrl]}
          initialIndex={0}
          isOpen={imageLightboxOpen}
          onClose={() => setImageLightboxOpen(false)}
        />
      )}
    </>
  );
}
