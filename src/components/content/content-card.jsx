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
  variant = "grid",
}) {
  const t = useTranslations();
  const locale = useLocale();

  const displayTitle = locale === "en" && titleEn ? titleEn : title;
  const displayDescription =
    locale === "en" && descriptionEn ? descriptionEn : description;

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString(
        locale === "ko" ? "ko-KR" : "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      )
    : null;

  if (variant === "compact") {
    return (
      <Card className="group flex items-center gap-4 p-3 transition-all hover:shadow-md">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0 text-muted-foreground">
            <ContentTypeIcon type={type} size={16} />
          </div>
          <Link
            href={`/content/${slug}`}
            className="flex items-center gap-2 truncate text-sm font-medium hover:underline sm:text-base"
          >
            {displayTitle}
            {isPremium && (
              <FaCrown size={12} className="shrink-0 text-yellow-500" />
            )}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
          <Badge variant="secondary" className="hidden text-xs sm:inline-flex">
            {t(`categories.${category}`)}
          </Badge>
          <span className="hidden text-xs sm:inline-block">
            {formattedDate}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              onBookmarkToggle?.();
            }}
            className="flex items-center justify-center transition-colors hover:text-primary"
          >
            {isBookmarked ? (
              <FaBookmark size={14} className="text-primary" />
            ) : (
              <FaRegBookmark size={14} />
            )}
          </button>
        </div>
      </Card>
    );
  }

  if (variant === "list") {
    return (
      <Card className="group flex flex-row overflow-hidden transition-all hover:shadow-lg">
        {/* Thumbnail */}
        <div className="relative h-28 w-40 shrink-0 overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={displayTitle}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ContentTypeIcon type={type} size={24} />
            </div>
          )}
          {isPremium && (
            <div className="absolute left-2 top-2">
              <Badge className="gap-1 bg-yellow-500 px-1.5 py-0 text-[10px] text-black">
                <FaCrown size={8} />
                {t("content.premium")}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between p-3 pl-4">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-5 gap-1 px-1.5 py-0 text-[10px]"
                >
                  <ContentTypeIcon type={type} size={10} />
                  {t(`contentTypes.${type}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formattedDate}
                </span>
              </div>
            </div>

            <Link href={`/content/${slug}`}>
              <h3 className="mb-1 line-clamp-1 text-base font-bold transition-colors hover:text-primary">
                {displayTitle}
              </h3>
            </Link>

            <p className="line-clamp-2 text-xs text-muted-foreground">
              {displayDescription}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {t(`categories.${category}`)}
            </Badge>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FaEye size={10} />
                {viewCount.toLocaleString()}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onBookmarkToggle?.();
                }}
                className="flex items-center justify-center transition-colors hover:text-primary"
              >
                {isBookmarked ? (
                  <FaBookmark size={12} className="text-primary" />
                ) : (
                  <FaRegBookmark size={12} />
                )}
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

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
              className="-m-2 flex min-h-[44px] min-w-[44px] items-center justify-center transition-colors hover:text-primary"
              aria-label={
                isBookmarked
                  ? t("content.bookmark.remove")
                  : t("content.bookmark.add")
              }
            >
              {isBookmarked ? (
                <FaBookmark size={14} className="text-primary" />
              ) : (
                <FaRegBookmark size={14} />
              )}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
