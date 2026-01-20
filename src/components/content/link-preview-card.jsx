"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, getDomainFromUrl } from "@/lib/utils";
import { FaCrown, FaGlobe } from "react-icons/fa6";

const KNOWN_PLATFORMS = {
  "youtube.com": { name: "YouTube", textClass: "text-red-600" },
  "github.com": { name: "GitHub", textClass: "text-gray-800" },
  "linkedin.com": { name: "LinkedIn", textClass: "text-blue-600" },
  "x.com": { name: "X", textClass: "text-gray-800" },
  "twitter.com": { name: "X", textClass: "text-gray-800" },
  "reddit.com": { name: "Reddit", textClass: "text-orange-600" },
  "threads.net": { name: "Threads", textClass: "text-gray-800" },
};

function getOgImageFromUrl(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, "");
    const pathname = urlObj.pathname;

    if (hostname === "github.com") {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const [owner, repo] = parts;
        return `https://opengraph.githubassets.com/1/${owner}/${repo}`;
      }
    }

    if (hostname === "youtube.com" || hostname === "youtu.be") {
      const videoId = urlObj.searchParams.get("v") || pathname.split("/").pop();
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default function LinkPreviewCard({
  slug,
  title,
  titleEn,
  description,
  descriptionEn,
  category,
  thumbnailUrl,
  externalUrl,
  publishedAt,
  isPremium = false,
}) {
  const t = useTranslations();
  const locale = useLocale();

  const displayTitle = locale === "en" && titleEn ? titleEn : title;
  const displayDescription =
    locale === "en" && descriptionEn ? descriptionEn : description;

  const domain = getDomainFromUrl(externalUrl);
  const platformConfig = domain ? KNOWN_PLATFORMS[domain] : null;

  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    : null;

  const imageUrl = thumbnailUrl || getOgImageFromUrl(externalUrl);

  return (
    <Link href={`/content/${slug}`} className="block h-full">
      <Card className="group flex h-full flex-col overflow-hidden transition-all hover:shadow-lg">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayTitle}
              className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              imageUrl ? "hidden" : "",
            )}
          >
            <FaGlobe className="h-12 w-12 text-muted-foreground/50" />
          </div>

          {isPremium && (
            <div className="absolute right-2 top-2">
              <Badge className="gap-1 bg-yellow-500 text-black">
                <FaCrown size={10} />
                {t("content.premium")}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          {domain && (
            <div className="mb-2 flex items-center gap-2">
              {faviconUrl && (
                <img
                  src={faviconUrl}
                  alt=""
                  className="h-4 w-4 rounded-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  platformConfig?.textClass || "text-muted-foreground",
                )}
              >
                {domain}
              </span>
            </div>
          )}

          <h3 className="mb-2 line-clamp-2 text-base font-bold transition-colors group-hover:text-primary">
            {displayTitle}
          </h3>

          <p className="mb-3 line-clamp-2 flex-1 text-sm text-muted-foreground">
            {displayDescription}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {category && (
              <Badge variant="secondary" className="text-xs">
                {t(`categories.${category}`)}
              </Badge>
            )}
            {publishedAt && (
              <span>
                {new Date(publishedAt).toLocaleDateString(
                  locale === "ko" ? "ko-KR" : "en-US",
                  { month: "short", day: "numeric" },
                )}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
