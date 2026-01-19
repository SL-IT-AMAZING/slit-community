"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { FaHeart, FaRetweet } from "react-icons/fa6";

import BaseSocialCard, {
  AuthorInfo,
  MetricItem,
  MediaGrid,
  formatRelativeTime,
} from "./base-social-card";
import DetailModal from "./detail-modal";

// Threads 아이콘 (react-icons에 없는 경우 커스텀)
function ThreadsIcon({ size = 16, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.088l-1.523-1.32c.662-.762 1.39-1.27 2.172-1.57.782-.297 1.63-.452 2.51-.468l.076-.002c1.898 0 3.403.634 4.473 1.883.837.975 1.358 2.282 1.555 3.895.666.282 1.255.638 1.763 1.066 1.026.865 1.78 2.047 2.178 3.415.486 1.672.369 3.545-.738 5.15-1.333 1.932-3.76 3.029-6.84 3.09h-.009c-.893-.017-1.747-.12-2.561-.309zm1.874-8.765c-.373-.021-.723-.01-1.05.033-1.18.074-2.477.455-2.477 1.564.005.403.196.93.907 1.39.543.353 1.262.47 1.96.43.986-.053 1.727-.381 2.2-.977.37-.466.617-1.108.742-1.947a8.345 8.345 0 0 0-2.282-.493z" />
    </svg>
  );
}

export default function ThreadsCard({
  content,
  authorName,
  authorHandle,
  authorAvatar,
  verified = false,
  likeCount,
  replyCount,
  repostCount,
  shareCount,
  publishedAt,
  mediaUrls = [],
  externalUrl,
  metricsHistory = [],
  contentId,
  translatedContent,
  hasVideo = false,
  threadsVideoUrl = null,
  className,
}) {
  const locale = useLocale();
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

  const modalData = {
    content,
    authorName,
    authorHandle,
    authorAvatar,
    verified,
    likeCount,
    replyCount,
    repostCount,
    shareCount,
    publishedAt,
    mediaUrls,
    externalUrl,
    metricsHistory,
    translatedContent,
    threadsVideoUrl,
  };

  return (
    <>
      <BaseSocialCard
        platform="threads"
        platformIcon={ThreadsIcon}
        externalUrl={externalUrl}
        className={className}
        onClick={() => setModalOpen(true)}
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
            className={`whitespace-pre-wrap break-words text-sm leading-relaxed transition-all ${
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

        {/* Media Grid with Lightbox */}
        <MediaGrid
          mediaUrls={mediaUrls}
          videoUrl={threadsVideoUrl}
          externalUrl={externalUrl}
        />

        {/* Date */}
        {publishedAt && (
          <p className="mt-3 text-sm text-muted-foreground">
            {formatRelativeTime(publishedAt, locale)}
          </p>
        )}

        {/* Metrics */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 sm:gap-4">
          <MetricItem
            icon={FaHeart}
            value={likeCount}
            label="Likes"
            className="hover:text-red-500"
          />
          <MetricItem
            icon={FaRetweet}
            value={repostCount}
            label="Reposts"
            className="hover:text-green-500"
          />
        </div>
      </BaseSocialCard>

      {/* Detail Modal */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        platform="threads"
        data={modalData}
      />
    </>
  );
}
