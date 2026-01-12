"use client";

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

import BaseSocialCard, { MetricItem, formatRelativeTime } from "./base-social-card";
import SparklineChart from "./sparkline-chart";
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
}) {
  const locale = useLocale();
  const langColor = languageColor || LANGUAGE_COLORS[language] || "#586069";

  return (
    <BaseSocialCard
      platform="github"
      platformIcon={FaGithub}
      externalUrl={externalUrl || `https://github.com/${repoOwner}/${repoName}`}
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

      {/* Description */}
      {description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* README Image */}
      {readmeImageUrl && (
        <div className="mt-3 overflow-hidden rounded-base border-2 border-border">
          <img
            src={readmeImageUrl}
            alt={`${repoName} preview`}
            className="h-auto w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Trendshift Badge Graph */}
      {trendshiftBadgeUrl && (
        <div className="mt-3 overflow-hidden rounded-base border-2 border-border bg-white">
          <a
            href={
              trendshiftRepoId
                ? `https://trendshift.io/repositories/${trendshiftRepoId}`
                : `https://trendshift.io`
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={trendshiftBadgeUrl}
              alt="Trendshift Trending Badge"
              className="h-auto w-full"
              loading="lazy"
            />
          </a>
        </div>
      )}

      {/* Star History Graph */}
      {starHistoryUrl && (
        <div className="mt-3 overflow-hidden rounded-base border-2 border-border bg-white">
          <a
            href={`https://star-history.com/#${repoOwner}/${repoName}&Date`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={starHistoryUrl}
              alt="Star History"
              className="h-auto w-full"
              loading="lazy"
            />
          </a>
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
          <MetricItem icon={FaCircleExclamation} value={issues} label="Issues" />
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

      {/* Star Trend Graph */}
      {metricsHistory && metricsHistory.length > 1 && (
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {locale === "ko" ? "스타 추이" : "Stars trend"}
          </span>
          <SparklineChart
            data={metricsHistory}
            dataKey="stars"
            width={100}
            height={28}
            showTrend
          />
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
  );
}
