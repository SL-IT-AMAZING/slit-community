"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import {
  FaYoutube,
  FaXTwitter,
  FaLinkedin,
  FaGithub,
  FaReddit,
  FaArrowUpRightFromSquare,
  FaEye,
  FaThumbsUp,
  FaHeart,
  FaRetweet,
  FaComment,
  FaShare,
  FaStar,
  FaCodeBranch,
  FaArrowUp,
} from "react-icons/fa6";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PLATFORM_CONFIG,
  AuthorInfo,
  MetricItem,
  MediaGrid,
  ImageLightbox,
  formatRelativeTime,
} from "./base-social-card";
import SparklineChart from "./sparkline-chart";

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

const PLATFORM_ICONS = {
  youtube: FaYoutube,
  x: FaXTwitter,
  linkedin: FaLinkedin,
  threads: ThreadsIcon,
  github: FaGithub,
  reddit: FaReddit,
};

export default function DetailModal({ isOpen, onClose, platform, data }) {
  const [mounted, setMounted] = React.useState(false);
  const locale = useLocale();

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

  if (!mounted || !isOpen || !data) return null;

  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.x;
  const PlatformIcon = PLATFORM_ICONS[platform] || FaXTwitter;

  const renderContent = () => {
    switch (platform) {
      case "youtube":
        return <YouTubeDetail data={data} locale={locale} />;
      case "x":
        return <XDetail data={data} locale={locale} />;
      case "threads":
        return <ThreadsDetail data={data} locale={locale} />;
      case "reddit":
        return <RedditDetail data={data} locale={locale} />;
      case "linkedin":
        return <LinkedInDetail data={data} locale={locale} />;
      case "github":
        return <GitHubDetail data={data} locale={locale} />;
      default:
        return null;
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3">
          <Badge
            variant="outline"
            className={cn("gap-1.5", config.bgColor, config.textColor)}
          >
            <PlatformIcon size={12} />
            {config.name}
          </Badge>
          <div className="flex items-center gap-2">
            {data.externalUrl && (
              <a
                href={data.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                  <FaArrowUpRightFromSquare size={12} />
                  {locale === "ko" ? "원본 보기" : "View Original"}
                </Button>
              </a>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-60px)] overflow-y-auto p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// YouTube 상세정보
function YouTubeDetail({ data, locale }) {
  const [showEmbed, setShowEmbed] = React.useState(false);

  // embedUrl이 전달되지 않은 경우 videoId로 생성
  const embedUrl =
    data.embedUrl ||
    (data.videoId
      ? `https://www.youtube.com/embed/${data.videoId}?autoplay=1`
      : null);

  return (
    <div className="space-y-4">
      {/* 비디오 플레이어 */}
      <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-border">
        {showEmbed && embedUrl ? (
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setShowEmbed(true)}
            className="group relative h-full w-full"
            disabled={!embedUrl}
          >
            {data.thumbnailUrl && (
              <img
                src={data.thumbnailUrl}
                alt={data.title}
                className="h-full w-full object-cover"
              />
            )}
            {/* 재생 버튼 오버레이 */}
            {embedUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
                  <svg
                    viewBox="0 0 24 24"
                    className="ml-1 h-8 w-8 fill-current"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        )}
      </div>

      {/* 채널 정보 */}
      <AuthorInfo
        name={data.channelName}
        avatar={data.channelAvatar}
        size="default"
      />

      {/* 제목 */}
      <h2 className="text-lg font-semibold">{data.title}</h2>

      {/* 설명 */}
      {data.description && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {data.description}
        </p>
      )}

      {/* 메트릭 */}
      <div className="flex flex-wrap items-center gap-4 border-t pt-4">
        <MetricItem icon={FaEye} value={data.viewCount} label="Views" />
        <MetricItem icon={FaThumbsUp} value={data.likeCount} label="Likes" />
        {data.publishedAt && (
          <span className="text-sm text-muted-foreground">
            {formatRelativeTime(data.publishedAt, locale)}
          </span>
        )}
      </div>

      {/* 그래프 */}
      {data.metricsHistory && data.metricsHistory.length > 1 && (
        <div className="border-t pt-4">
          <span className="text-sm font-medium">
            {locale === "ko" ? "조회수 추이" : "Views trend"}
          </span>
          <div className="mt-2">
            <SparklineChart
              data={data.metricsHistory}
              dataKey="views"
              width={200}
              height={60}
              showTrend
            />
          </div>
        </div>
      )}
    </div>
  );
}

// X (Twitter) 상세정보
function XDetail({ data, locale }) {
  const displayContent =
    locale === "ko" && data.translatedContent
      ? data.translatedContent
      : data.content;

  return (
    <div className="space-y-4">
      {/* 작성자 */}
      <AuthorInfo
        name={data.authorName}
        handle={data.authorHandle}
        avatar={data.authorAvatar}
        verified={data.verified}
      />

      {/* 콘텐츠 */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {displayContent?.replace(/\\n/g, "\n")}
      </p>

      {/* 미디어 */}
      <MediaGrid
        mediaUrls={data.mediaUrls}
        videoUrl={data.twitterVideoUrl}
        youtubeEmbedUrl={data.youtubeEmbedUrl}
        youtubeVideoId={data.youtubeVideoId}
      />

      {/* 메트릭 */}
      <div className="flex flex-wrap items-center gap-4 border-t pt-4">
        <MetricItem icon={FaHeart} value={data.likeCount} label="Likes" />
        <MetricItem
          icon={FaRetweet}
          value={data.retweetCount}
          label="Retweets"
        />
        {data.publishedAt && (
          <span className="text-sm text-muted-foreground">
            {formatRelativeTime(data.publishedAt, locale)}
          </span>
        )}
      </div>

      {/* 그래프 */}
      {data.metricsHistory && data.metricsHistory.length > 1 && (
        <div className="border-t pt-4">
          <span className="text-sm font-medium">
            {locale === "ko" ? "좋아요 추이" : "Likes trend"}
          </span>
          <div className="mt-2">
            <SparklineChart
              data={data.metricsHistory}
              dataKey="likes"
              width={200}
              height={60}
              showTrend
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Threads 상세정보
function ThreadsDetail({ data, locale }) {
  const displayContent =
    locale === "ko" && data.translatedContent
      ? data.translatedContent
      : data.content;

  return (
    <div className="space-y-4">
      {/* 작성자 */}
      <AuthorInfo
        name={data.authorName}
        handle={data.authorHandle}
        avatar={data.authorAvatar}
        verified={data.verified}
      />

      {/* 콘텐츠 */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {displayContent?.replace(/\\n/g, "\n")}
      </p>

      {/* 미디어 */}
      <MediaGrid mediaUrls={data.mediaUrls} videoUrl={data.threadsVideoUrl} />

      {/* 메트릭 */}
      <div className="flex flex-wrap items-center gap-4 border-t pt-4">
        <MetricItem icon={FaHeart} value={data.likeCount} label="Likes" />
        <MetricItem icon={FaRetweet} value={data.repostCount} label="Reposts" />
        {data.publishedAt && (
          <span className="text-sm text-muted-foreground">
            {formatRelativeTime(data.publishedAt, locale)}
          </span>
        )}
      </div>

      {/* 그래프 */}
      {data.metricsHistory && data.metricsHistory.length > 1 && (
        <div className="border-t pt-4">
          <span className="text-sm font-medium">
            {locale === "ko" ? "좋아요 추이" : "Likes trend"}
          </span>
          <div className="mt-2">
            <SparklineChart
              data={data.metricsHistory}
              dataKey="likes"
              width={200}
              height={60}
              showTrend
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Reddit 상세정보
function RedditDetail({ data, locale }) {
  const displayContent = (
    locale === "ko" && data.translatedContent
      ? data.translatedContent
      : data.content
  )?.replace(/\\n/g, "\n");
  const displayTitle =
    locale === "ko" && data.translatedTitle ? data.translatedTitle : data.title;
  const upvoteRatio =
    data.upvotes && data.downvotes
      ? data.upvotes / (data.upvotes + data.downvotes)
      : 1;

  return (
    <div className="space-y-4">
      {/* 서브레딧 & 작성자 */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
          <FaReddit size={14} />
        </div>
        <span className="text-sm font-semibold">r/{data.subreddit}</span>
        <span className="text-sm text-muted-foreground">
          {locale === "ko" ? "에 게시됨" : "Posted by"}
        </span>
        <span className="text-sm text-muted-foreground">
          u/{data.authorName}
        </span>
      </div>

      {/* 제목 */}
      <h2 className="text-lg font-semibold">{displayTitle}</h2>

      {/* 콘텐츠 */}
      {displayContent && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {displayContent}
        </p>
      )}

      {/* 미디어 */}
      {data.mediaUrls && data.mediaUrls.length > 0 ? (
        <MediaGrid mediaUrls={data.mediaUrls} />
      ) : data.mediaUrl ? (
        <div className="overflow-hidden rounded-lg border">
          <img
            src={data.mediaUrl}
            alt=""
            className="h-auto w-full object-cover"
          />
        </div>
      ) : null}

      {/* 메트릭 */}
      <div className="flex flex-wrap items-center gap-4 border-t pt-4">
        {/* Upvotes - 위 화살표 + 추천수만 표시 */}
        <div className="flex items-center gap-1">
          <FaArrowUp className="text-orange-500" size={14} />
          <span className="font-semibold text-orange-500">
            {data.upvotes >= 1000
              ? `${(data.upvotes / 1000).toFixed(1)}k`
              : data.upvotes || 0}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round(upvoteRatio * 100)}%{" "}
          {locale === "ko" ? "추천" : "upvoted"}
        </span>
        {data.publishedAt && (
          <span className="text-sm text-muted-foreground">
            {formatRelativeTime(data.publishedAt, locale)}
          </span>
        )}
      </div>

      {/* 그래프 */}
      {data.metricsHistory && data.metricsHistory.length > 1 && (
        <div className="border-t pt-4">
          <span className="text-sm font-medium">
            {locale === "ko" ? "추천수 추이" : "Score trend"}
          </span>
          <div className="mt-2">
            <SparklineChart
              data={data.metricsHistory}
              dataKey="score"
              width={200}
              height={60}
              showTrend
            />
          </div>
        </div>
      )}
    </div>
  );
}

// LinkedIn 상세정보
function LinkedInDetail({ data, locale }) {
  return (
    <div className="space-y-4">
      {/* 작성자 */}
      <div className="flex items-start gap-3">
        {data.authorAvatar ? (
          <img
            src={data.authorAvatar}
            alt={data.authorName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-lg font-semibold text-white">
            {data.authorName?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
        <div>
          <p className="font-semibold">{data.authorName}</p>
          {data.authorTitle && (
            <p className="text-sm text-muted-foreground">{data.authorTitle}</p>
          )}
          {data.publishedAt && (
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(data.publishedAt, locale)}
            </p>
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {data.content}
      </p>

      {/* 미디어 */}
      {data.mediaUrls && data.mediaUrls.length > 0 && (
        <MediaGrid mediaUrls={data.mediaUrls} />
      )}

      {/* 아티클 미리보기 */}
      {data.articlePreview && (
        <a
          href={data.articlePreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border transition-colors hover:bg-muted/50"
        >
          {data.articlePreview.imageUrl && (
            <img
              src={data.articlePreview.imageUrl}
              alt={data.articlePreview.title}
              className="aspect-video w-full object-cover"
            />
          )}
          <div className="p-3">
            <p className="font-semibold">{data.articlePreview.title}</p>
            {data.articlePreview.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {data.articlePreview.description}
              </p>
            )}
          </div>
        </a>
      )}

      {/* 메트릭 */}
      <div className="flex flex-wrap items-center gap-4 border-t pt-4">
        <MetricItem icon={FaThumbsUp} value={data.likeCount} label="Likes" />
        <MetricItem
          icon={FaComment}
          value={data.commentCount}
          label="Comments"
        />
        <MetricItem icon={FaShare} value={data.repostCount} label="Reposts" />
      </div>

      {/* 그래프 */}
      {data.metricsHistory && data.metricsHistory.length > 1 && (
        <div className="border-t pt-4">
          <span className="text-sm font-medium">
            {locale === "ko" ? "반응 추이" : "Engagement trend"}
          </span>
          <div className="mt-2">
            <SparklineChart
              data={data.metricsHistory}
              dataKey="likes"
              width={200}
              height={60}
              showTrend
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GitHubDetail({ data, locale }) {
  const [readmeLightboxOpen, setReadmeLightboxOpen] = React.useState(false);
  const [badgeLightboxOpen, setBadgeLightboxOpen] = React.useState(false);
  const [starHistoryLightboxOpen, setStarHistoryLightboxOpen] =
    React.useState(false);

  const LANGUAGE_COLORS = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
  };
  const langColor =
    data.languageColor || LANGUAGE_COLORS[data.language] || "#586069";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FaGithub size={24} className="text-muted-foreground" />
        <a
          href={
            data.externalUrl ||
            `https://github.com/${data.repoOwner}/${data.repoName}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-lg font-semibold hover:text-primary hover:underline"
        >
          <span className="text-muted-foreground">{data.repoOwner}/</span>
          {data.repoName}
        </a>
      </div>

      {(data.trendshiftBadgeUrl ||
        data.starHistoryUrl ||
        data.readmeImageUrl) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.trendshiftBadgeUrl && (
            <div
              className="cursor-pointer overflow-hidden rounded-lg border bg-white p-2 transition-opacity hover:opacity-90"
              onClick={() => setBadgeLightboxOpen(true)}
            >
              <img
                src={data.trendshiftBadgeUrl}
                alt="Trendshift Trending Badge"
                className="mx-auto h-auto max-h-[100px] object-contain"
              />
            </div>
          )}

          {data.starHistoryUrl && (
            <div
              className="cursor-pointer overflow-hidden rounded-lg border bg-white transition-opacity hover:opacity-90"
              onClick={() => setStarHistoryLightboxOpen(true)}
            >
              <img
                src={data.starHistoryUrl}
                alt="Star History"
                className="h-auto max-h-[140px] w-full object-contain"
              />
            </div>
          )}

          {data.readmeImageUrl && (
            <div
              className="cursor-pointer overflow-hidden rounded-lg border bg-muted/50 transition-opacity hover:opacity-90 sm:col-span-2"
              onClick={() => setReadmeLightboxOpen(true)}
            >
              <img
                src={data.readmeImageUrl}
                alt={`${data.repoName} preview`}
                className="mx-auto h-auto max-h-[200px] w-auto object-contain"
              />
            </div>
          )}
        </div>
      )}

      {data.llmSummary ? (
        <div className="space-y-3">
          {data.llmSummary.summary && (
            <p className="text-sm font-medium">{data.llmSummary.summary}</p>
          )}
          {data.llmSummary.features && data.llmSummary.features.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {locale === "ko" ? "✅ 주요 기능" : "✅ Key Features"}
              </p>
              <ul className="space-y-1.5">
                {data.llmSummary.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.llmSummary.use_cases &&
            data.llmSummary.use_cases.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  {locale === "ko" ? "💡 활용 사례" : "💡 Use Cases"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.llmSummary.use_cases.join(", ")}
                </p>
              </div>
            )}
          {data.llmSummary.beginner_description && (
            <p className="text-sm italic text-primary">
              🔥 {data.llmSummary.beginner_description}
            </p>
          )}
        </div>
      ) : data.description ? (
        <p className="text-sm text-muted-foreground">{data.description}</p>
      ) : null}

      {data.topics && data.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.topics.map((topic) => (
            <Badge key={topic} variant="secondary" className="text-xs">
              {topic}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t pt-4">
        {data.language && (
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: langColor }}
            />
            {data.language}
          </span>
        )}
        <MetricItem icon={FaStar} value={data.stars} label="Stars" />
        <MetricItem icon={FaCodeBranch} value={data.forks} label="Forks" />
      </div>

      {data.metricsHistory && data.metricsHistory.length > 1 && (
        <div className="border-t pt-4">
          <span className="text-sm font-medium">
            {locale === "ko" ? "스타 추이" : "Stars trend"}
          </span>
          <div className="mt-2">
            <SparklineChart
              data={data.metricsHistory}
              dataKey="stars"
              width={200}
              height={60}
              showTrend
            />
          </div>
        </div>
      )}

      {data.lastUpdated && (
        <p className="text-xs text-muted-foreground">
          {locale === "ko" ? "업데이트" : "Updated"}{" "}
          {formatRelativeTime(data.lastUpdated, locale)}
        </p>
      )}

      {data.readmeImageUrl && (
        <ImageLightbox
          images={[data.readmeImageUrl]}
          initialIndex={0}
          isOpen={readmeLightboxOpen}
          onClose={() => setReadmeLightboxOpen(false)}
        />
      )}
      {data.trendshiftBadgeUrl && (
        <ImageLightbox
          images={[data.trendshiftBadgeUrl]}
          initialIndex={0}
          isOpen={badgeLightboxOpen}
          onClose={() => setBadgeLightboxOpen(false)}
        />
      )}
      {data.starHistoryUrl && (
        <ImageLightbox
          images={[data.starHistoryUrl]}
          initialIndex={0}
          isOpen={starHistoryLightboxOpen}
          onClose={() => setStarHistoryLightboxOpen(false)}
        />
      )}
    </div>
  );
}
