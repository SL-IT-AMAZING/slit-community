"use client";

import { useLocale } from "next-intl";
import {
  FaReddit,
  FaArrowUp,
  FaArrowDown,
  FaComment,
  FaAward,
} from "react-icons/fa6";

import BaseSocialCard, {
  AuthorInfo,
  MetricItem,
  formatRelativeTime,
} from "./base-social-card";
import SparklineChart from "./sparkline-chart";
import TranslateButton from "../translate-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function RedditCard({
  title,
  content,
  subreddit,
  authorName,
  authorAvatar,
  upvotes,
  downvotes,
  commentCount,
  awards = [],
  publishedAt,
  mediaUrl,
  externalUrl,
  metricsHistory = [],
  contentId,
  translatedTitle,
  translatedContent,
  className,
}) {
  const locale = useLocale();
  const score = (upvotes || 0) - (downvotes || 0);
  const upvoteRatio = upvotes && downvotes ? upvotes / (upvotes + downvotes) : 1;

  return (
    <BaseSocialCard
      platform="reddit"
      platformIcon={FaReddit}
      externalUrl={externalUrl}
      className={className}
    >
      {/* Subreddit & Author */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
          <FaReddit size={14} />
        </div>
        <span className="text-sm font-semibold">r/{subreddit}</span>
        <span className="text-sm text-muted-foreground">
          {locale === "ko" ? "에 게시됨" : "Posted by"}
        </span>
        <div className="flex items-center gap-1">
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={authorName}
              className="h-5 w-5 rounded-full object-cover"
            />
          ) : null}
          <span className="text-sm text-muted-foreground">u/{authorName}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-2 font-semibold leading-tight">{title}</h3>

      {/* Title Translate Button */}
      {title && (
        <TranslateButton
          text={title}
          translatedText={translatedTitle}
          contentId={contentId}
          field="title"
          className="mt-1"
        />
      )}

      {/* Content */}
      {content && (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {content}
        </p>
      )}

      {/* Content Translate Button */}
      {content && (
        <TranslateButton
          text={content}
          translatedText={translatedContent}
          contentId={contentId}
          field="content"
          className="mt-1"
        />
      )}

      {/* Media */}
      {mediaUrl && (
        <div className="mt-3 overflow-hidden rounded-base border-2 border-border">
          <img
            src={mediaUrl}
            alt=""
            className="h-auto w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Awards */}
      {awards && awards.length > 0 && (
        <div className="mt-3 flex items-center gap-1">
          {awards.slice(0, 5).map((award, i) => (
            <span
              key={i}
              className="flex items-center gap-0.5 text-xs"
              title={award.name}
            >
              <FaAward className="text-yellow-500" size={14} />
              {award.count > 1 && (
                <span className="text-muted-foreground">x{award.count}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      {publishedAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          {formatRelativeTime(publishedAt, locale)}
        </p>
      )}

      {/* Voting & Metrics */}
      <div className="mt-3 flex items-center gap-4 border-t pt-3">
        {/* Vote Score */}
        <div className="flex items-center gap-1">
          <button className="rounded p-1 hover:bg-orange-500/10 hover:text-orange-500">
            <FaArrowUp size={16} />
          </button>
          <span
            className={cn(
              "min-w-[40px] text-center text-sm font-semibold",
              score > 0 && "text-orange-500",
              score < 0 && "text-blue-500"
            )}
          >
            {score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score}
          </span>
          <button className="rounded p-1 hover:bg-blue-500/10 hover:text-blue-500">
            <FaArrowDown size={16} />
          </button>
        </div>

        {/* Upvote Ratio */}
        <span className="text-xs text-muted-foreground">
          {Math.round(upvoteRatio * 100)}% {locale === "ko" ? "추천" : "upvoted"}
        </span>

        {/* Comments */}
        <MetricItem
          icon={FaComment}
          value={commentCount}
          label="Comments"
          className="ml-auto"
        />
      </div>

      {/* Trend Graph */}
      {metricsHistory && metricsHistory.length > 1 && (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {locale === "ko" ? "추천수 추이" : "Score trend"}
          </span>
          <SparklineChart
            data={metricsHistory}
            dataKey="score"
            width={80}
            height={24}
          />
        </div>
      )}
    </BaseSocialCard>
  );
}
