"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  FaReddit,
  FaArrowUp,
  FaAward,
} from "react-icons/fa6";

import BaseSocialCard, {
  AuthorInfo,
  MediaGrid,
  formatRelativeTime,
} from "./base-social-card";
import DetailModal from "./detail-modal";

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
  mediaUrls = [],
  externalUrl,
  metricsHistory = [],
  contentId,
  translatedTitle,
  translatedContent,
  className,
}) {
  const locale = useLocale();
  const upvoteRatio = upvotes && downvotes ? upvotes / (upvotes + downvotes) : 1;

  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const contentRef = useRef(null);

  const MAX_HEIGHT = 120; // 최대 높이 (px)

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > MAX_HEIGHT);
    }
  }, [content, translatedContent, locale]);

  // 미디어 URL 배열 구성 (mediaUrl이 있으면 배열에 추가)
  const allMediaUrls = mediaUrls.length > 0 ? mediaUrls : (mediaUrl ? [mediaUrl] : []);

  const modalData = {
    title,
    content,
    subreddit,
    authorName,
    authorAvatar,
    upvotes,
    downvotes,
    commentCount,
    awards,
    publishedAt,
    mediaUrl,
    mediaUrls: allMediaUrls,
    externalUrl,
    metricsHistory,
    translatedTitle,
    translatedContent,
  };

  return (
    <>
      <BaseSocialCard
        platform="reddit"
        platformIcon={FaReddit}
        externalUrl={externalUrl}
        className={className}
        onClick={() => setModalOpen(true)}
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

        {/* Title - locale에 따라 분기 */}
        <h3 className="mt-2 font-semibold leading-tight">
          {locale === "ko" && translatedTitle ? translatedTitle : title}
        </h3>

        {/* Content - locale에 따라 분기 */}
        {(content || translatedContent) && (
          <div className="relative mt-2">
            <p
              ref={contentRef}
              className={`whitespace-pre-wrap break-words text-sm text-muted-foreground transition-all ${
                !expanded && isOverflowing ? "max-h-[120px] overflow-hidden" : ""
              }`}
            >
              {(locale === "ko" && translatedContent ? translatedContent : content)?.replace(/\\n/g, '\n')}
            </p>
            {/* 그라데이션 + 더보기 버튼 */}
            {isOverflowing && !expanded && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card to-transparent pt-8">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(true);
                  }}
                  className="min-h-[44px] px-2 py-1 text-sm font-medium text-primary hover:underline"
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
                className="mt-2 min-h-[44px] px-2 py-1 text-sm font-medium text-primary hover:underline"
              >
                {locale === "ko" ? "접기" : "Show less"}
              </button>
            )}
          </div>
        )}

        {/* Media Grid */}
        {allMediaUrls.length > 0 && (
          <MediaGrid mediaUrls={allMediaUrls} />
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
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 sm:gap-4">
          {/* Upvotes - 위 화살표 + 추천수만 표시 */}
          <div className="flex items-center gap-1">
            <FaArrowUp size={16} className="text-orange-500" />
            <span className="text-sm font-semibold text-orange-500">
              {upvotes >= 1000 ? `${(upvotes / 1000).toFixed(1)}k` : upvotes || 0}
            </span>
          </div>

          {/* Upvote Ratio */}
          <span className="text-xs text-muted-foreground">
            {Math.round(upvoteRatio * 100)}% {locale === "ko" ? "추천" : "upvoted"}
          </span>
        </div>
      </BaseSocialCard>

      {/* Detail Modal */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        platform="reddit"
        data={modalData}
      />
    </>
  );
}
