"use client";

import { useLocale } from "next-intl";
import { FaXTwitter, FaHeart, FaRetweet, FaComment } from "react-icons/fa6";

import BaseSocialCard, {
  AuthorInfo,
  MetricItem,
  formatRelativeTime,
} from "./base-social-card";
import SparklineChart from "./sparkline-chart";
import TranslateButton from "../translate-button";
import { cn } from "@/lib/utils";

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
  className,
}) {
  const locale = useLocale();

  // 미디어 그리드 레이아웃 결정
  const getMediaGridClass = (count) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-2";
    return "grid-cols-2";
  };

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

      {/* Content */}
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
        {content}
      </p>

      {/* Translate Button */}
      {content && (
        <TranslateButton
          text={content}
          translatedText={translatedContent}
          contentId={contentId}
          field="content"
          className="mt-2"
        />
      )}

      {/* Media Grid */}
      {mediaUrls && mediaUrls.length > 0 && (
        <div
          className={cn(
            "mt-3 grid gap-0.5 overflow-hidden rounded-xl border-2 border-border",
            getMediaGridClass(mediaUrls.length)
          )}
        >
          {mediaUrls.slice(0, 4).map((url, i) => (
            <div
              key={i}
              className={cn(
                "relative aspect-square overflow-hidden",
                mediaUrls.length === 1 && "aspect-video",
                mediaUrls.length === 3 && i === 0 && "row-span-2 aspect-auto"
              )}
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {mediaUrls.length > 4 && i === 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-bold text-white">
                  +{mediaUrls.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Date */}
      {publishedAt && (
        <p className="mt-3 text-sm text-muted-foreground">
          {formatRelativeTime(publishedAt, locale)}
        </p>
      )}

      {/* Metrics */}
      <div className="mt-3 flex items-center gap-6 border-t pt-3">
        <MetricItem
          icon={FaComment}
          value={replyCount}
          label="Replies"
          className="hover:text-blue-500"
        />
        <MetricItem
          icon={FaRetweet}
          value={retweetCount}
          label="Retweets"
          className="hover:text-green-500"
        />
        <MetricItem
          icon={FaHeart}
          value={likeCount}
          label="Likes"
          className="hover:text-red-500"
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
