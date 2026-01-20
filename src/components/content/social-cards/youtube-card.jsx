"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { FaYoutube, FaEye, FaThumbsUp, FaClock } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import BaseSocialCard, {
  AuthorInfo,
  MetricItem,
  formatRelativeTime,
} from "./base-social-card";
import DetailModal, { preprocessMarkdown } from "./detail-modal";
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
  digestSummary,
  fullDigest,
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
  const displayTitle =
    locale === "ko" && translatedTitle ? translatedTitle : title;
  const displayDescription =
    locale === "ko" && translatedDescription
      ? translatedDescription
      : description;

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
    thumbnailUrl ||
    (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

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
    externalUrl:
      externalUrl ||
      (videoId ? `https://youtube.com/watch?v=${videoId}` : null),
    thumbnailUrl: thumbnail,
    metricsHistory,
    translatedTitle,
    translatedDescription,
    fullDigest,
  };

  return (
    <>
      <BaseSocialCard
        platform="youtube"
        platformIcon={FaYoutube}
        externalUrl={
          externalUrl ||
          (videoId ? `https://youtube.com/watch?v=${videoId}` : null)
        }
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
          <AuthorInfo name={channelName} avatar={channelAvatar} size="sm" />
        </div>

        {/* Title */}
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold">
          {displayTitle}
        </h3>

        {/* Summary - GitHub 카드 스타일 */}
        <div className="relative mt-2">
          <div
            ref={contentRef}
            className={`transition-all ${
              !expanded && isOverflowing ? "max-h-[100px] overflow-hidden" : ""
            }`}
          >
            {digestSummary?.answer ? (
              <>
                <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert [&_p]:my-0 [&_p]:text-sm [&_p]:text-foreground [&_strong]:text-pink-500 dark:[&_strong]:text-yellow-400">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {preprocessMarkdown(digestSummary.answer)}
                  </ReactMarkdown>
                </div>
                {digestSummary.points && digestSummary.points.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {digestSummary.points.slice(0, 3).map((point, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-xs text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        <span className="prose prose-sm prose-neutral max-w-none dark:prose-invert [&_p]:my-0 [&_p]:text-xs [&_p]:text-muted-foreground [&_strong]:text-pink-500 dark:[&_strong]:text-yellow-400">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {preprocessMarkdown(point)}
                          </ReactMarkdown>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {digestSummary.targetAudience && (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    🎯 {digestSummary.targetAudience}
                  </p>
                )}
              </>
            ) : displayDescription ? (
              <div className="prose prose-neutral max-w-none break-words text-xs dark:prose-invert [&_*]:text-xs [&_p]:my-1 [&_p]:text-muted-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {preprocessMarkdown(displayDescription)}
                </ReactMarkdown>
              </div>
            ) : null}
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

        {/* 요약보기 버튼 */}
        {digestSummary && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(true);
            }}
            className="text-mtext mt-3 flex w-full items-center justify-center gap-2 rounded-base border-2 border-border bg-main px-3 py-2 text-sm font-medium shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            {locale === "ko" ? "AI 요약 보기" : "View AI Summary"}
          </button>
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
