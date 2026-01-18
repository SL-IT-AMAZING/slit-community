"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { FaXTwitter, FaHeart, FaRetweet } from "react-icons/fa6";

import BaseSocialCard, {
  AuthorInfo,
  MetricItem,
  MediaGrid,
  formatRelativeTime,
} from "./base-social-card";
import SparklineChart from "./sparkline-chart";

export default function XCard({
  content,
  authorName,
  authorHandle,
  authorAvatar,
  verified = false,
  likeCount,
  retweetCount,
  replyCount,
  publishedAt,
  mediaUrls = [],
  externalUrl,
  metricsHistory = [],
  contentId,
  translatedContent,
  hasVideo = false,
  youtubeEmbedUrl = null,
  youtubeVideoId = null,
  twitterVideoUrl = null,
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
  }, [content, translatedContent, locale]);

  return (
    <BaseSocialCard
      platform="x"
      platformIcon={FaXTwitter}
      externalUrl={externalUrl}
      className={className}
    >
      {/* Author */}
      <AuthorInfo
        name={authorName}
        handle={authorHandle}
        avatar={authorAvatar}
        verified={verified}
      />

      {/* Content - locale에 따라 분기 */}
      <div className="relative mt-3">
        <p
          ref={contentRef}
          className={`whitespace-pre-wrap text-sm leading-relaxed transition-all ${
            !expanded && isOverflowing ? "max-h-[120px] overflow-hidden" : ""
          }`}
        >
          {(locale === "ko" && translatedContent ? translatedContent : content)?.replace(/\\n/g, '\n')}
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

      {/* Media Grid (비디오 + 사진 통합) */}
      <MediaGrid
        mediaUrls={mediaUrls}
        videoUrl={twitterVideoUrl}
        youtubeEmbedUrl={youtubeEmbedUrl}
        youtubeVideoId={youtubeVideoId}
        externalUrl={externalUrl}
      />

      {/* Date */}
      {publishedAt && (
        <p className="mt-3 text-sm text-muted-foreground">
          {formatRelativeTime(publishedAt, locale)}
        </p>
      )}

      {/* Metrics */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 sm:gap-6">
        <MetricItem
          icon={FaHeart}
          value={likeCount}
          label="Likes"
          className="hover:text-red-500"
        />
        <MetricItem
          icon={FaRetweet}
          value={retweetCount}
          label="Retweets"
          className="hover:text-green-500"
        />
      </div>

      {/* Trend Graph */}
      {metricsHistory && metricsHistory.length > 1 && (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {locale === "ko" ? "좋아요 추이" : "Likes trend"}
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
