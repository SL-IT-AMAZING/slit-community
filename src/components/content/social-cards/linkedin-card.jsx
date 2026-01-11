"use client";

import { useLocale } from "next-intl";
import { FaLinkedin, FaThumbsUp, FaComment, FaShare } from "react-icons/fa6";

import BaseSocialCard, {
  AuthorInfo,
  MetricItem,
  formatRelativeTime,
} from "./base-social-card";
import SparklineChart from "./sparkline-chart";
import { cn } from "@/lib/utils";

export default function LinkedInCard({
  content,
  authorName,
  authorTitle,
  authorAvatar,
  likeCount,
  commentCount,
  repostCount,
  publishedAt,
  articlePreview,
  externalUrl,
  metricsHistory = [],
  className,
}) {
  const locale = useLocale();

  return (
    <BaseSocialCard
      platform="linkedin"
      platformIcon={FaLinkedin}
      externalUrl={externalUrl}
      className={className}
    >
      {/* Author */}
      <div className="flex items-start gap-3">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-lg font-semibold text-white">
            {authorName?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
        <div>
          <p className="font-semibold">{authorName}</p>
          {authorTitle && (
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {authorTitle}
            </p>
          )}
          {publishedAt && (
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(publishedAt, locale)}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed">
        {content}
      </p>

      {/* Article Preview */}
      {articlePreview && (
        <a
          href={articlePreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block overflow-hidden rounded-base border-2 border-border transition-colors hover:bg-muted/50"
        >
          {articlePreview.imageUrl && (
            <img
              src={articlePreview.imageUrl}
              alt={articlePreview.title}
              className="aspect-video w-full object-cover"
              loading="lazy"
            />
          )}
          <div className="p-3">
            <p className="line-clamp-2 font-semibold">{articlePreview.title}</p>
            {articlePreview.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {articlePreview.description}
              </p>
            )}
          </div>
        </a>
      )}

      {/* Metrics */}
      <div className="mt-3 flex items-center gap-4 border-t pt-3">
        <MetricItem
          icon={FaThumbsUp}
          value={likeCount}
          label="Likes"
          className="hover:text-blue-500"
        />
        <MetricItem
          icon={FaComment}
          value={commentCount}
          label="Comments"
          className="hover:text-blue-500"
        />
        <MetricItem
          icon={FaShare}
          value={repostCount}
          label="Reposts"
          className="hover:text-blue-500"
        />
      </div>

      {/* Trend Graph */}
      {metricsHistory && metricsHistory.length > 1 && (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {locale === "ko" ? "반응 추이" : "Engagement trend"}
          </span>
          <SparklineChart
            data={metricsHistory}
            dataKey="likes"
            width={80}
            height={24}
          />
        </div>
      )}
    </BaseSocialCard>
  );
}
