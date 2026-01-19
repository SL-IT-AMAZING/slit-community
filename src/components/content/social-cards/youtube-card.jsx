"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { FaYoutube, FaEye, FaThumbsUp, FaClock } from "react-icons/fa6";

import BaseSocialCard, {
  AuthorInfo,
  MetricItem,
  formatRelativeTime,
} from "./base-social-card";
import DetailModal from "./detail-modal";
import { cn } from "@/lib/utils";

export default function YouTubeCard({
  videoId,
  title,
  description,
  channelName,
  channelAvatar,
  viewCount,
  likeCount,
  duration,
  publishedAt,
  externalUrl,
  thumbnailUrl,
  metricsHistory = [],
  translatedTitle,
  translatedDescription,
  className,
}) {
  const locale = useLocale();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef(null);

  // locale 기반 제목/설명 선택
  const displayTitle = locale === "ko" && translatedTitle ? translatedTitle : title;
  const displayDescription = locale === "ko" && translatedDescription ? translatedDescription : description;

  const MAX_HEIGHT = 60; // 최대 높이 (px) - description은 더 짧게

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > MAX_HEIGHT);
    }
  }, [displayDescription]);

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1`
    : null;

  const thumbnail =
    thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  const formatDuration = (dur) => {
    if (!dur) return "";
    // ISO 8601 duration format (PT10M30S)
    const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return dur;
    const [, h, m, s] = match;
    const parts = [];
    if (h) parts.push(h);
    parts.push(m ? m.padStart(h ? 2 : 1, "0") : "0");
    parts.push((s || "0").padStart(2, "0"));
    return parts.join(":");
  };

  const modalData = {
    videoId,
    embedUrl,
    title: displayTitle,
    description: displayDescription,
    channelName,
    channelAvatar,
    viewCount,
    likeCount,
    duration,
    publishedAt,
    externalUrl: externalUrl || (videoId ? `https://youtube.com/watch?v=${videoId}` : null),
    thumbnailUrl: thumbnail,
    metricsHistory,
    translatedTitle,
    translatedDescription,
  };

  return (
    <>
      <BaseSocialCard
        platform="youtube"
        platformIcon={FaYoutube}
        externalUrl={externalUrl || (videoId ? `https://youtube.com/watch?v=${videoId}` : null)}
        className={className}
        onClick={() => setModalOpen(true)}
      >
        {/* Video Embed / Thumbnail */}
        <div className="relative aspect-video overflow-hidden rounded-base border-2 border-border">
          {showEmbed && embedUrl ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsLoaded(true)}
            />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEmbed(true);
              }}
              className="group/play relative h-full w-full"
            >
              {thumbnail && (
                <img
                  src={thumbnail}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              )}
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover/play:bg-black/40">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover/play:scale-110">
                  <svg
                    viewBox="0 0 24 24"
                    className="ml-1 h-8 w-8 fill-current"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              {/* Duration badge */}
              {duration && (
                <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                  {formatDuration(duration)}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Channel Info */}
        <div className="mt-3">
          <AuthorInfo
            name={channelName}
            avatar={channelAvatar}
            size="sm"
          />
        </div>

        {/* Title */}
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold">{displayTitle}</h3>

        {/* Description with Show More */}
        {displayDescription && (
          <div className="relative mt-2">
            <p
              ref={contentRef}
              className={`whitespace-pre-wrap break-words text-xs text-muted-foreground transition-all ${
                !expanded && isOverflowing ? "max-h-[60px] overflow-hidden" : ""
              }`}
            >
              {displayDescription}
            </p>
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

        {/* Metrics */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <MetricItem icon={FaEye} value={viewCount} label="Views" />
          <MetricItem icon={FaThumbsUp} value={likeCount} label="Likes" />
          {publishedAt && (
            <span className="text-sm text-muted-foreground">
              {formatRelativeTime(publishedAt, locale)}
            </span>
          )}
        </div>
      </BaseSocialCard>

      {/* Detail Modal */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        platform="youtube"
        data={modalData}
      />
    </>
  );
}
