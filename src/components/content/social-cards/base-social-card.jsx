"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";

// 플랫폼별 설정
export const PLATFORM_CONFIG = {
  youtube: {
    name: "YouTube",
    color: "#FF0000",
    bgColor: "bg-red-500/10",
    textColor: "text-red-500",
  },
  x: {
    name: "트위터",
    color: "#000000",
    bgColor: "bg-foreground/10",
    textColor: "text-foreground",
  },
  linkedin: {
    name: "LinkedIn",
    color: "#0077B5",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-500",
  },
  threads: {
    name: "Threads",
    color: "#000000",
    bgColor: "bg-foreground/10",
    textColor: "text-foreground",
  },
  github: {
    name: "GitHub",
    color: "#24292e",
    bgColor: "bg-foreground/10",
    textColor: "text-foreground",
  },
  reddit: {
    name: "Reddit",
    color: "#FF4500",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-500",
  },
};

export default function BaseSocialCard({
  platform,
  platformIcon: PlatformIcon,
  externalUrl,
  children,
  className,
  compact = false,
  onClick,
}) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.x;

  const handleCardClick = (e) => {
    // 버튼이나 링크, 비디오/이미지 클릭은 무시
    if (
      e.target.closest("button") ||
      e.target.closest("a") ||
      e.target.closest("video") ||
      e.target.closest("iframe") ||
      e.target.tagName === "IMG"
    ) {
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Card
      className={cn(
        "group flex flex-col overflow-hidden transition-all hover:shadow-lg",
        onClick && "cursor-pointer",
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className={cn("flex-shrink-0 pb-2", compact && "py-3")}>
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn("gap-1.5", config.bgColor, config.textColor)}
          >
            {PlatformIcon && <PlatformIcon size={12} />}
            {config.name}
          </Badge>
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
            >
              <Button variant="ghost" size="sm" className="h-8 w-8 min-h-[44px] min-w-[44px] p-0">
                <FaArrowUpRightFromSquare size={14} />
              </Button>
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("flex-1 overflow-hidden", compact && "pb-3")}>
        {children}
      </CardContent>
    </Card>
  );
}

// 작성자 정보 컴포넌트
export function AuthorInfo({
  name,
  handle,
  avatar,
  subtitle,
  verified = false,
  size = "default",
}) {
  const avatarSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const nameSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-center gap-3">
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className={cn(avatarSize, "rounded-full object-cover")}
        />
      ) : (
        <div
          className={cn(
            avatarSize,
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground"
          )}
        >
          {name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className={cn("font-semibold truncate", nameSize)}>{name}</span>
          {verified && (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-blue-500"
              aria-label="Verified"
            >
              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
            </svg>
          )}
        </div>
        {handle && (
          <span className="text-sm text-muted-foreground">
            {handle.startsWith('@') ? handle : `@${handle}`}
          </span>
        )}
        {subtitle && !handle && (
          <span className="text-sm text-muted-foreground line-clamp-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

// 수치 표시 컴포넌트
export function MetricItem({ icon: Icon, value, label, className }) {
  // undefined/null이면 0으로 처리
  const numValue = value === undefined || value === null ? 0 : value;
  const formattedValue =
    typeof numValue === "number"
      ? numValue >= 1000000
        ? `${(numValue / 1000000).toFixed(1)}M`
        : numValue >= 1000
        ? `${(numValue / 1000).toFixed(1)}K`
        : numValue.toLocaleString()
      : numValue;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-sm text-muted-foreground",
        className
      )}
      title={label}
      onClick={(e) => e.stopPropagation()}
    >
      {Icon && <Icon size={14} />}
      {formattedValue}
    </span>
  );
}

// 이미지 라이트박스 컴포넌트 (Portal로 body에 렌더링)
export function ImageLightbox({ images, initialIndex = 0, isOpen, onClose }) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowLeft") setCurrentIndex((prev) => Math.max(0, prev - 1));
        if (e.key === "ArrowRight") setCurrentIndex((prev) => Math.min(images.length - 1, prev + 1));
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, images.length, onClose]);

  if (!mounted || !isOpen || !images || images.length === 0) return null;

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 sm:right-4 sm:top-4"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 이전 버튼 */}
      {images.length > 1 && currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => prev - 1); }}
          className="absolute left-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 sm:left-4"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 이미지 */}
      <img
        src={images[currentIndex]}
        alt=""
        className="max-h-[85vh] max-w-[95vw] object-contain sm:max-h-[90vh] sm:max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      />

      {/* 다음 버튼 */}
      {images.length > 1 && currentIndex < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => prev + 1); }}
          className="absolute right-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 sm:right-4"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* 인디케이터 */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
              className={cn(
                "relative h-2.5 w-2.5 rounded-full transition-colors before:absolute before:-inset-2",
                i === currentIndex ? "bg-white" : "bg-white/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Portal을 사용하여 document.body에 직접 렌더링
  return createPortal(lightboxContent, document.body);
}

// 미디어 그리드 컴포넌트 (이미지 + 비디오 통합 지원)
// 레이아웃: 1개(16:9), 2개(1:1 나란히), 3개+(왼쪽 크게 + 오른쪽 2개 스택)
export function MediaGrid({
  mediaUrls = [],
  videoUrl = null,
  youtubeEmbedUrl = null,
  youtubeVideoId = null,
  externalUrl,
  className,
}) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [videoLightboxOpen, setVideoLightboxOpen] = React.useState(false);
  const [youtubeLightboxOpen, setYoutubeLightboxOpen] = React.useState(false);

  // 전체 미디어 목록 구성 (비디오 포함)
  const hasVideo = !!videoUrl;
  const hasYoutube = !!youtubeEmbedUrl && !!youtubeVideoId;
  const totalItems = mediaUrls.length + (hasVideo ? 1 : 0) + (hasYoutube ? 1 : 0);

  const openImageLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (totalItems === 0) return null;

  // 미디어 아이템 렌더러
  const renderYouTube = (itemClassName) => {
    const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
    return (
      <div
        key="youtube"
        className={cn("relative overflow-hidden cursor-pointer group", itemClassName)}
        onClick={(e) => {
          e.stopPropagation();
          setYoutubeLightboxOpen(true);
        }}
      >
        <img
          src={thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
            <svg className="h-6 w-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
          YouTube
        </div>
      </div>
    );
  };

  const renderVideo = (itemClassName) => (
    <div
      key="video"
      className={cn("relative overflow-hidden cursor-pointer group bg-black", itemClassName)}
      onClick={(e) => {
        e.stopPropagation();
        setVideoLightboxOpen(true);
      }}
    >
      <video
        src={videoUrl}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
          <svg className="h-6 w-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );

  const renderImage = (url, index, itemClassName, showOverlay = false, overlayCount = 0) => (
    <div
      key={`img-${index}`}
      className={cn("relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity", itemClassName)}
      onClick={(e) => {
        e.stopPropagation();
        openImageLightbox(index);
      }}
    >
      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      {showOverlay && overlayCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-bold text-white">
          +{overlayCount}
        </div>
      )}
    </div>
  );

  // 모든 미디어 아이템 배열 생성
  const allItems = [];
  if (hasYoutube) allItems.push({ type: 'youtube' });
  if (hasVideo) allItems.push({ type: 'video' });
  mediaUrls.forEach((url, i) => allItems.push({ type: 'image', url, index: i }));

  // 1개: 16:9 전체
  if (totalItems === 1) {
    const item = allItems[0];
    return (
      <>
        <div className={cn("mt-3 overflow-hidden rounded-xl border-2 border-border", className)}>
          {item.type === 'youtube' && renderYouTube("aspect-video")}
          {item.type === 'video' && renderVideo("aspect-video")}
          {item.type === 'image' && renderImage(item.url, item.index, "aspect-video")}
        </div>
        <ImageLightbox images={mediaUrls} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
        <VideoLightbox videoUrl={videoUrl} isOpen={videoLightboxOpen} onClose={() => setVideoLightboxOpen(false)} />
        <YouTubeLightbox embedUrl={youtubeEmbedUrl} isOpen={youtubeLightboxOpen} onClose={() => setYoutubeLightboxOpen(false)} />
      </>
    );
  }

  // 2개: 모바일에서도 나란히 배치
  if (totalItems === 2) {
    return (
      <>
        <div className={cn("mt-3 grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border-2 border-border aspect-[2/1]", className)}>
          {allItems.map((item, i) => {
            if (item.type === 'youtube') return renderYouTube("h-full");
            if (item.type === 'video') return renderVideo("h-full");
            return renderImage(item.url, item.index, "h-full");
          })}
        </div>
        <ImageLightbox images={mediaUrls} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
        <VideoLightbox videoUrl={videoUrl} isOpen={videoLightboxOpen} onClose={() => setVideoLightboxOpen(false)} />
        <YouTubeLightbox embedUrl={youtubeEmbedUrl} isOpen={youtubeLightboxOpen} onClose={() => setYoutubeLightboxOpen(false)} />
      </>
    );
  }

  // 3개 이상: 모바일에서는 2x2 그리드, 데스크탑에서는 왼쪽 크게 + 오른쪽 스택
  const displayItems = allItems.slice(0, 3);
  const remainingCount = totalItems - 3;

  return (
    <>
      <div className={cn("mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl border-2 border-border sm:grid-cols-[2fr_1fr] sm:grid-rows-2 sm:gap-0.5 sm:aspect-[16/9]", className)}>
        {/* 첫 번째: 모바일에서는 전체 너비, 데스크탑에서는 왼쪽 (row-span-2) */}
        {displayItems[0] && (
          displayItems[0].type === 'youtube' ? renderYouTube("col-span-2 aspect-video sm:col-span-1 sm:row-span-2 sm:aspect-auto") :
          displayItems[0].type === 'video' ? renderVideo("col-span-2 aspect-video sm:col-span-1 sm:row-span-2 sm:aspect-auto") :
          renderImage(displayItems[0].url, displayItems[0].index, "col-span-2 aspect-video sm:col-span-1 sm:row-span-2 sm:aspect-auto")
        )}
        {/* 두 번째: 오른쪽 위 */}
        {displayItems[1] && (
          displayItems[1].type === 'youtube' ? renderYouTube("aspect-square sm:aspect-auto") :
          displayItems[1].type === 'video' ? renderVideo("aspect-square sm:aspect-auto") :
          renderImage(displayItems[1].url, displayItems[1].index, "aspect-square sm:aspect-auto")
        )}
        {/* 세 번째: 오른쪽 아래 (+N 오버레이) */}
        {displayItems[2] && (
          displayItems[2].type === 'youtube' ? renderYouTube("aspect-square sm:aspect-auto") :
          displayItems[2].type === 'video' ? renderVideo("aspect-square sm:aspect-auto") :
          renderImage(displayItems[2].url, displayItems[2].index, "aspect-square sm:aspect-auto", remainingCount > 0, remainingCount)
        )}
      </div>
      <ImageLightbox images={mediaUrls} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
      <VideoLightbox videoUrl={videoUrl} isOpen={videoLightboxOpen} onClose={() => setVideoLightboxOpen(false)} />
      <YouTubeLightbox embedUrl={youtubeEmbedUrl} isOpen={youtubeLightboxOpen} onClose={() => setYoutubeLightboxOpen(false)} />
    </>
  );
}

// YouTube 라이트박스 컴포넌트 (Portal로 body에 렌더링)
export function YouTubeLightbox({ embedUrl, isOpen, onClose }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !embedUrl) return null;

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-2 sm:p-4"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 sm:right-4 sm:top-4"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* YouTube iframe */}
      <div
        className="aspect-video w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`${embedUrl}?autoplay=1`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full rounded-lg"
        />
      </div>
    </div>
  );

  return createPortal(lightboxContent, document.body);
}

// Video 라이트박스 컴포넌트 (Twitter 네이티브 비디오용)
export function VideoLightbox({ videoUrl, isOpen, onClose }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !videoUrl) return null;

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-2 sm:p-4"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 sm:right-4 sm:top-4"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Video */}
      <div
        className="aspect-video w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={videoUrl}
          controls
          autoPlay
          playsInline
          className="h-full w-full rounded-lg"
        />
      </div>
    </div>
  );

  return createPortal(lightboxContent, document.body);
}

// YouTube 썸네일 컴포넌트 (클릭하면 라이트박스로 재생)
export function YouTubeThumbnail({ embedUrl, videoId, className }) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  // YouTube 썸네일 URL 생성
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null;

  if (!embedUrl || !videoId) return null;

  return (
    <>
      <div
        className={cn(
          "mt-3 relative aspect-video w-full overflow-hidden rounded-lg cursor-pointer group",
          className
        )}
        onClick={() => setLightboxOpen(true)}
      >
        {/* 썸네일 이미지 */}
        <img
          src={thumbnailUrl}
          alt="YouTube video thumbnail"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          onError={(e) => {
            // maxresdefault가 없으면 hqdefault로 폴백
            e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }}
        />
        {/* 재생 버튼 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110 sm:h-16 sm:w-16">
            <svg className="h-6 w-6 ml-0.5 sm:h-8 sm:w-8 sm:ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* YouTube 로고 */}
        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
          YouTube
        </div>
      </div>
      <YouTubeLightbox
        embedUrl={embedUrl}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

// 날짜 포맷 유틸
export function formatRelativeTime(date, locale = "ko") {
  if (!date) return "";

  const now = new Date();
  const target = new Date(date);
  const diff = now - target;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (locale === "ko") {
    if (years > 0) return `${years}년 전`;
    if (months > 0) return `${months}개월 전`;
    if (weeks > 0) return `${weeks}주 전`;
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return "방금 전";
  }

  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
