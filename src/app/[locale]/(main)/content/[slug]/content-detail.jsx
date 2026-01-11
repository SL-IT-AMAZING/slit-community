"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import {
  FaArrowLeft,
  FaBookmark,
  FaRegBookmark,
  FaEye,
  FaCalendar,
  FaCrown,
  FaNewspaper,
  FaVideo,
  FaCode,
  FaLink,
  FaShare,
} from "react-icons/fa6";

import { createClient } from "@/lib/supabase/client";

function ContentTypeIcon({ type, size = 16 }) {
  switch (type) {
    case "video":
      return <FaVideo size={size} />;
    case "open-source":
      return <FaCode size={size} />;
    default:
      return <FaNewspaper size={size} />;
  }
}

export default function ContentDetail({ content, locale }) {
  const { data: session } = useSession();
  const t = useTranslations();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const displayTitle = locale === "en" && content.titleEn
    ? content.titleEn
    : content.title;

  const displayDescription = locale === "en" && content.descriptionEn
    ? content.descriptionEn
    : content.description;

  const displayBody = locale === "en" && content.bodyEn
    ? content.bodyEn
    : content.body;

  const formattedDate = content.publishedAt
    ? new Date(content.publishedAt).toLocaleDateString(
        locale === "ko" ? "ko-KR" : "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )
    : null;

  const handleBookmark = async () => {
    if (!session?.user?.id) {
      return;
    }

    const supabase = createClient();

    try {
      if (isBookmarked) {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", session.user.id)
          .eq("content_id", content.id);
      } else {
        await supabase.from("bookmarks").insert({
          user_id: session.user.id,
          content_id: content.id,
        });
      }
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error("Bookmark error:", error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: displayTitle,
        text: displayDescription,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  // Premium content gate
  if (content.isPremium && !session?.user?.isPremium) {
    return (
      <div className="container max-w-4xl py-8">
        {/* Back button */}
        <Link href="/content" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <FaArrowLeft size={14} />
          {t("content.backToList")}
        </Link>

        {/* Title */}
        <h1 className="mb-4 font-cera text-3xl font-bold md:text-4xl">
          {displayTitle}
        </h1>

        {/* Premium Gate Card */}
        <Card className="mt-8 border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FaCrown size={48} className="mb-4 text-yellow-500" />
            <h2 className="mb-2 text-2xl font-bold">
              {t("content.premiumTitle")}
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              {t("content.premiumGateDescription")}
            </p>
            <Link href="/premium">
              <Button size="lg">
                <FaCrown className="mr-2" size={16} />
                {t("content.subscribeToPremium")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Back button */}
      <Link href="/content" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <FaArrowLeft size={14} />
        {t("content.backToList")}
      </Link>

      {/* Header */}
      <header className="mb-8">
        {/* Badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <ContentTypeIcon type={content.type} size={12} />
            {t(`contentTypes.${content.type}`)}
          </Badge>
          <Badge variant="secondary">
            {t(`categories.${content.category}`)}
          </Badge>
          {content.isPremium && (
            <Badge className="gap-1 bg-yellow-500 text-black">
              <FaCrown size={10} />
              {t("content.premium")}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="mb-4 font-cera text-3xl font-bold md:text-4xl">
          {displayTitle}
        </h1>

        {/* Description */}
        <p className="mb-6 text-lg text-muted-foreground">
          {displayDescription}
        </p>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {formattedDate && (
            <span className="flex items-center gap-1">
              <FaCalendar size={14} />
              {formattedDate}
            </span>
          )}
          <span className="flex items-center gap-1">
            <FaEye size={14} />
            {content.viewCount.toLocaleString()} {t("content.views")}
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center gap-2">
          <Button
            variant={isBookmarked ? "default" : "outline"}
            size="sm"
            onClick={handleBookmark}
          >
            {isBookmarked ? (
              <FaBookmark className="mr-2" size={14} />
            ) : (
              <FaRegBookmark className="mr-2" size={14} />
            )}
            {isBookmarked ? t("content.bookmarked") : t("content.bookmarkButton")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <FaShare className="mr-2" size={14} />
            {t("content.share")}
          </Button>
          {content.externalUrl && (
            <a href={content.externalUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <FaLink className="mr-2" size={14} />
                {t("content.viewOriginal")}
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* Thumbnail */}
      {content.thumbnailUrl && (
        <div className="mb-8 overflow-hidden rounded-lg">
          <img
            src={content.thumbnailUrl}
            alt={displayTitle}
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      {/* Content body */}
      <article className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-cera prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-pre:bg-muted prose-pre:text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {displayBody || ""}
        </ReactMarkdown>
      </article>

      {/* Tags */}
      {content.tags && content.tags.length > 0 && (
        <div className="mt-8 border-t pt-8">
          <h3 className="mb-4 font-semibold">
            {t("content.tags")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {content.tags.map((tag, index) => (
              <Badge key={index} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
