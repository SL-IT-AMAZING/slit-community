"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  FaNewspaper,
  FaVideo,
  FaCode,
  FaBookmark,
  FaRegBookmark,
  FaEye,
  FaArrowRight,
  FaCrown,
} from "react-icons/fa6";

function ContentTypeIcon({ type, size = 12 }) {
  switch (type) {
    case "video":
      return <FaVideo size={size} />;
    case "open-source":
      return <FaCode size={size} />;
    default:
      return <FaNewspaper size={size} />;
  }
}

export default function ContentCard({
  slug,
  title,
  titleEn,
  description,
  descriptionEn,
  type,
  category,
  isPremium = false,
  isFeatured = false,
  viewCount = 0,
  thumbnailUrl,
  publishedAt,
  isBookmarked = false,
  onBookmarkToggle,
}) {
  const t = useTranslations();
  const locale = useLocale();

  const displayTitle = locale === "en" && titleEn ? titleEn : title;
  const displayDescription =
    locale === "en" && descriptionEn ? descriptionEn : description;

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card className="group flex flex-col overflow-hidden transition-all hover:shadow-lg">
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={displayTitle}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
          {isPremium && (
            <div className="absolute right-2 top-2">
              <Badge className="gap-1 bg-yellow-500 text-black">
                <FaCrown size={10} />
                {t("content.premium")}
              </Badge>
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-2">
        {/* Type and Premium Badge */}
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="outline" className="gap-1">
            <ContentTypeIcon type={type} />
            {t(`contentTypes.${type}`)}
          </Badge>
          {!thumbnailUrl && isPremium && (
            <Badge className="gap-1 bg-yellow-500/10 text-yellow-500">
              <FaCrown size={10} />
              {t("content.premium")}
            </Badge>
          )}
        </div>

        {/* Title */}
        <Link href={`/content/${slug}`}>
          <CardTitle className="line-clamp-2 text-lg transition-colors hover:text-primary">
            {displayTitle}
          </CardTitle>
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {displayDescription}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Category */}
          <Badge variant="secondary" className="text-xs">
            {t(`categories.${category}`)}
          </Badge>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {formattedDate && <span>{formattedDate}</span>}
            <span className="flex items-center gap-1">
              <FaEye size={12} />
              {viewCount.toLocaleString()}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                onBookmarkToggle?.();
              }}
              className="flex items-center gap-1 transition-colors hover:text-primary"
              aria-label={isBookmarked ? t("content.bookmark.remove") : t("content.bookmark.add")}
            >
              {isBookmarked ? (
                <FaBookmark size={12} className="text-primary" />
              ) : (
                <FaRegBookmark size={12} />
              )}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
