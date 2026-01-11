"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { FaYoutube, FaEye, FaThumbsUp, FaClock } from "react-icons/fa6";

import BaseSocialCard, {
  AuthorInfo,
  MetricItem,
  formatRelativeTime,
} from "./base-social-card";
import SparklineChart from "./sparkline-chart";
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
  className,
}) {
  const locale = useLocale();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

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

  return (
    <BaseSocialCard
      platform="youtube"
      platformIcon={FaYoutube}
      externalUrl={externalUrl || (videoId ? `https://youtube.com/watch?v=${videoId}` : null)}
      className={className}
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
            onClick={() => setShowEmbed(true)}
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
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold">{title}</h3>

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

      {/* Trend Graph */}
      {metricsHistory && metricsHistory.length > 1 && (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {locale === "ko" ? "조회수 추이" : "Views trend"}
          </span>
          <SparklineChart
            data={metricsHistory}
            dataKey="views"
            width={80}
            height={24}
          />
        </div>
      )}
    </BaseSocialCard>
  );
}
