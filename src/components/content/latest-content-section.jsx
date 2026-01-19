"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { SocialCardRenderer } from "./social-cards";
import { cn } from "@/lib/utils";

import {
  FaYoutube,
  FaXTwitter,
  FaLinkedin,
  FaGithub,
  FaReddit,
  FaArrowRight,
} from "react-icons/fa6";

// Threads 아이콘
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

const PLATFORMS = [
  { id: "youtube", icon: FaYoutube, label: "YouTube", labelKo: "YouTube", color: "#FF0000", type: "video" },
  { id: "x", icon: FaXTwitter, label: "X", labelKo: "트위터", color: "#000000", type: "x-thread" },
  { id: "linkedin", icon: FaLinkedin, label: "LinkedIn", labelKo: "LinkedIn", color: "#0077B5", type: "linkedin" },
  { id: "threads", icon: ThreadsIcon, label: "Threads", labelKo: "Threads", color: "#000000", type: "threads" },
  { id: "github", icon: FaGithub, label: "GitHub", labelKo: "GitHub", color: "#24292e", type: "open-source" },
  { id: "reddit", icon: FaReddit, label: "Reddit", labelKo: "Reddit", color: "#FF4500", type: "reddit" },
];

export default function LatestContentSection({
  content = [],
  title,
  subtitle,
  showViewAll = true,
  className,
}) {
  const locale = useLocale();
  const t = useTranslations();

  // 플랫폼별로 콘텐츠 그룹화
  const contentByPlatform = useMemo(() => {
    const grouped = {};
    PLATFORMS.forEach((platform) => {
      grouped[platform.id] = content.filter((item) => item.type === platform.type);
    });
    return grouped;
  }, [content]);

  return (
    <section className={cn("mb-16", className)}>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-cera text-2xl font-bold">
            {title || t("home.latest.title")}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground">
              {subtitle || t("home.latest.subtitle")}
            </p>
          )}
        </div>
        {showViewAll && (
          <Link href="/content">
            <Button variant="link" className="gap-1">
              {t("common.viewAll")}
              <FaArrowRight size={12} />
            </Button>
          </Link>
        )}
      </div>

      {/* 플랫폼별 행 */}
      <div className="space-y-8">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const platformContent = contentByPlatform[platform.id] || [];

          return (
            <div key={platform.id}>
              {/* 플랫폼 헤더 */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md"
                    style={{ backgroundColor: platform.color }}
                  >
                    <Icon size={16} className="text-white" />
                  </div>
                  <h3 className="font-semibold">
                    {locale === "ko" ? platform.labelKo : platform.label}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    ({platformContent.length})
                  </span>
                </div>
                {platformContent.length > 0 && (
                  <Link href={`/content?type=${platform.type}`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-sm">
                      {locale === "ko" ? "모두보기" : "View all"}
                      <FaArrowRight size={10} />
                    </Button>
                  </Link>
                )}
              </div>

              {/* 콘텐츠 가로 스크롤 */}
              {platformContent.length > 0 ? (
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0">
                  {platformContent.map((item) => (
                    <div key={item.id} className="w-[calc(100vw-32px)] flex-shrink-0 sm:w-80 md:w-96">
                      <SocialCardRenderer content={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-48 items-center justify-center rounded-base border-2 border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    {locale === "ko" ? "콘텐츠가 없습니다" : "No content yet"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
