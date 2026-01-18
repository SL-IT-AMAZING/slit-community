"use client";

import { useState, useRef, useEffect } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef(null);

  const MAX_HEIGHT = 120; // 최대 높이 (px)

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > MAX_HEIGHT);
    }
  }, [content, locale]);

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
      <div className="relative mt-3">
        <p
          ref={contentRef}
          className={`whitespace-pre-wrap text-sm leading-relaxed transition-all ${
            !expanded && isOverflowing ? "max-h-[120px] overflow-hidden" : ""
          }`}
        >
          {content}
        </p>
        {/* 그라데이션 + 더보기 버튼 */}
        {isOverflowing && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card to-transparent pt-8">
            <button
              onClick={() => setExpanded(true)}
              className="min-h-[44px] px-2 py-1 text-sm font-medium text-primary hover:underline"
            >
              {locale === "ko" ? "더보기" : "Show more"}
            </button>
          </div>
        )}
        {/* 접기 버튼 */}
        {expanded && isOverflowing && (
          <button
            onClick={() => setExpanded(false)}
            className="mt-2 min-h-[44px] px-2 py-1 text-sm font-medium text-primary hover:underline"
          >
            {locale === "ko" ? "접기" : "Show less"}
          </button>
        )}
      </div>

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
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 sm:gap-4">
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
