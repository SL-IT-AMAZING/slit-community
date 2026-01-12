"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  FaYoutube,
  FaReddit,
  FaXTwitter,
  FaLinkedin,
  FaThreads,
  FaRotate,
  FaWandMagicSparkles,
  FaBan,
  FaTrash,
  FaArrowUpRightFromSquare,
  FaUpload,
  FaEye,
  FaClock,
  FaUser,
  FaImage,
  FaCode,
  FaGrip,
  FaList,
  FaGithub,
  FaChartLine,
  FaFileLines,
  FaTerminal,
  FaCopy,
} from "react-icons/fa6";

import { createClient } from "@/lib/supabase/client";

const PLATFORMS = [
  { id: "all", name: "All", nameKo: "전체" },
  { id: "youtube", name: "YouTube", nameKo: "유튜브", icon: FaYoutube, color: "text-red-500" },
  { id: "reddit", name: "Reddit", nameKo: "레딧", icon: FaReddit, color: "text-orange-500" },
  { id: "x", name: "X", nameKo: "X", icon: FaXTwitter, color: "text-foreground" },
  { id: "threads", name: "Threads", nameKo: "쓰레드", icon: FaThreads, color: "text-foreground" },
  { id: "github", name: "GitHub", nameKo: "깃허브", icon: FaGithub, color: "text-foreground" },
  { id: "trendshift", name: "Trendshift", nameKo: "트렌드시프트", icon: FaChartLine, color: "text-purple-500" },
  { id: "linkedin", name: "LinkedIn", nameKo: "링크드인", icon: FaLinkedin, color: "text-blue-600" },
];

const STATUSES = [
  { id: "all", name: "All", nameKo: "전체" },
  { id: "pending", name: "Pending", nameKo: "대기중" },
  { id: "processing", name: "Processing", nameKo: "처리중" },
  { id: "completed", name: "Completed", nameKo: "완료" },
  { id: "ignored", name: "Ignored", nameKo: "무시됨" },
];

// URL 기반으로 같은 저장소 그룹화 (GitHub + Trendshift 통합)
function groupByRepository(items) {
  const grouped = {};
  const nonGithubItems = [];

  items.forEach((item) => {
    // GitHub URL을 가진 항목만 그룹화 (github, trendshift)
    if (item.platform === "github" || item.platform === "trendshift") {
      const githubUrl = item.url;
      if (!grouped[githubUrl]) {
        grouped[githubUrl] = {
          ...item,
          platforms: [item.platform],
          relatedItems: [],
          mergedRawData: { ...item.raw_data },
        };
      } else {
        grouped[githubUrl].platforms.push(item.platform);
        grouped[githubUrl].relatedItems.push(item);
        // raw_data 병합 (기존 데이터 유지하면서 새 데이터 추가)
        grouped[githubUrl].mergedRawData = {
          ...grouped[githubUrl].mergedRawData,
          ...item.raw_data,
        };
      }
    } else {
      nonGithubItems.push(item);
    }
  });

  return [...Object.values(grouped), ...nonGithubItems];
}

function PlatformIcon({ platform, size = 16 }) {
  const platformConfig = PLATFORMS.find((p) => p.id === platform);
  if (!platformConfig?.icon) return null;
  const Icon = platformConfig.icon;
  return <Icon className={platformConfig.color} size={size} />;
}

function StatusBadge({ status, locale }) {
  const statusConfig = {
    pending: { color: "bg-yellow-500/10 text-yellow-500", label: locale === "ko" ? "대기중" : "Pending" },
    processing: { color: "bg-blue-500/10 text-blue-500", label: locale === "ko" ? "처리중" : "Processing" },
    completed: { color: "bg-green-500/10 text-green-500", label: locale === "ko" ? "완료" : "Completed" },
    ignored: { color: "bg-gray-500/10 text-gray-500", label: locale === "ko" ? "무시됨" : "Ignored" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return <Badge className={config.color}>{config.label}</Badge>;
}

function formatTimeAgo(dateString, locale) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return locale === "ko" ? `${diffMins}분 전` : `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return locale === "ko" ? `${diffHours}시간 전` : `${diffHours}h ago`;
  }
  return locale === "ko" ? `${diffDays}일 전` : `${diffDays}d ago`;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(num) {
  if (num === undefined || num === null) return "0";
  const n = typeof num === "string" ? parseInt(num, 10) : num;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

// 상세 정보 다이얼로그
function DetailDialog({ item, open, onClose, locale }) {
  const [showRawData, setShowRawData] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {/* 통합된 경우 여러 플랫폼 아이콘 표시 */}
            <div className="flex gap-1">
              {item.platforms ? (
                item.platforms.map((p) => (
                  <PlatformIcon key={p} platform={p} size={24} />
                ))
              ) : (
                <PlatformIcon platform={item.platform} size={24} />
              )}
            </div>
            <div>
              <DialogTitle className="text-left">
                {item.title || (locale === "ko" ? "(제목 없음)" : "(No title)")}
              </DialogTitle>
              <DialogDescription className="text-left">
                {item.platforms
                  ? item.platforms.map((p) => p.toUpperCase()).join(" + ")
                  : item.platform.toUpperCase()}{" "}
                - {item.platform_id}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* 상태 및 기본 정보 */}
          <div className="flex flex-wrap gap-4">
            <StatusBadge status={item.status} locale={locale} />
            {item.video_duration && (
              <Badge variant="outline" className="gap-1">
                <FaClock size={10} />
                {item.video_duration}
              </Badge>
            )}
          </div>

          {/* 썸네일/스크린샷 */}
          {(item.thumbnail_url || item.screenshot_url) && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FaImage size={12} />
                {locale === "ko" ? "이미지" : "Image"}
              </h4>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                {item.thumbnail_url ? (
                  <Image
                    src={item.thumbnail_url}
                    alt={item.title || "Thumbnail"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : item.screenshot_url ? (
                  <Image
                    src={item.screenshot_url}
                    alt={item.title || "Screenshot"}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                ) : null}
              </div>
            </div>
          )}

          {/* Star History Graph - GitHub 또는 통합된 항목 */}
          {(item.raw_data?.star_history_url || item.mergedRawData?.star_history_url) && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FaChartLine size={12} />
                {locale === "ko" ? "스타 히스토리" : "Star History"}
              </h4>
              <div className="overflow-hidden rounded-lg border bg-white p-2">
                <img
                  src={item.mergedRawData?.star_history_url || item.raw_data?.star_history_url}
                  alt="Star History"
                  className="w-full"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Trendshift Badge - Trendshift 또는 통합된 항목 */}
          {(item.raw_data?.badge_url || item.mergedRawData?.badge_url) && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FaChartLine size={12} />
                {locale === "ko" ? "트렌드시프트 뱃지" : "Trendshift Badge"}
              </h4>
              <div className="overflow-hidden rounded-lg border bg-white p-4">
                <img
                  src={item.mergedRawData?.badge_url || item.raw_data?.badge_url}
                  alt="Trendshift Badge"
                  className="h-auto max-w-full"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* 설명 */}
          {item.description && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {locale === "ko" ? "설명" : "Description"}
              </h4>
              <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                {item.description}
              </p>
            </div>
          )}

          {/* 본문 콘텐츠 */}
          {item.content_text && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FaFileLines size={12} />
                  {locale === "ko" ? "본문 내용" : "Content"} ({item.content_text.length.toLocaleString()}{locale === "ko" ? "자" : " chars"})
                </h4>
                {item.content_text.length > 500 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullContent(!showFullContent)}
                    className="text-xs"
                  >
                    {showFullContent
                      ? locale === "ko" ? "접기" : "Collapse"
                      : locale === "ko" ? "전체 보기" : "Show All"}
                  </Button>
                )}
              </div>
              <div className={`overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm ${
                showFullContent ? "max-h-96" : "max-h-40"
              }`}>
                {showFullContent ? item.content_text : item.content_text.slice(0, 500) + (item.content_text.length > 500 ? "..." : "")}
              </div>
            </div>
          )}

          {/* 수치 정보 (플랫폼별) */}
          {item.raw_data && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {locale === "ko" ? "수치" : "Metrics"}
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {/* YouTube */}
                {item.platform === "youtube" && (
                  <>
                    {item.raw_data.viewCount && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.viewCount)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "조회수" : "Views"}</p>
                      </div>
                    )}
                    {item.raw_data.likeCount && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.likeCount)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "좋아요" : "Likes"}</p>
                      </div>
                    )}
                    {item.raw_data.commentCount && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.commentCount)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "댓글" : "Comments"}</p>
                      </div>
                    )}
                  </>
                )}
                {/* Reddit */}
                {item.platform === "reddit" && (
                  <>
                    {item.raw_data.score !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.score)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "점수" : "Score"}</p>
                      </div>
                    )}
                    {item.raw_data.num_comments !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.num_comments)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "댓글" : "Comments"}</p>
                      </div>
                    )}
                    {item.raw_data.upvote_ratio !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{Math.round(item.raw_data.upvote_ratio * 100)}%</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "추천율" : "Upvote"}</p>
                      </div>
                    )}
                  </>
                )}
                {/* X (Twitter) */}
                {item.platform === "x" && (
                  <>
                    {item.raw_data.views !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.views)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "조회수" : "Views"}</p>
                      </div>
                    )}
                    {item.raw_data.likes !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.likes)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "좋아요" : "Likes"}</p>
                      </div>
                    )}
                    {item.raw_data.retweets !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.retweets)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "리트윗" : "Retweets"}</p>
                      </div>
                    )}
                    {item.raw_data.replies !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.replies)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "답글" : "Replies"}</p>
                      </div>
                    )}
                  </>
                )}
                {/* Threads */}
                {item.platform === "threads" && (
                  <>
                    {item.raw_data.likes !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.likes)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "좋아요" : "Likes"}</p>
                      </div>
                    )}
                    {item.raw_data.replies !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.replies)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "답글" : "Replies"}</p>
                      </div>
                    )}
                    {item.raw_data.reposts !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.reposts)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "리포스트" : "Reposts"}</p>
                      </div>
                    )}
                  </>
                )}
                {/* GitHub */}
                {item.platform === "github" && (
                  <>
                    {item.raw_data.stars !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.stars)}</p>
                        <p className="text-xs text-muted-foreground">Stars</p>
                      </div>
                    )}
                    {item.raw_data.forks !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.forks)}</p>
                        <p className="text-xs text-muted-foreground">Forks</p>
                      </div>
                    )}
                    {item.raw_data.periodStars !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">+{formatNumber(item.raw_data.periodStars)}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "기간 스타" : "Period"}</p>
                      </div>
                    )}
                    {item.raw_data.language && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{item.raw_data.language}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "언어" : "Language"}</p>
                      </div>
                    )}
                  </>
                )}
                {/* Trendshift */}
                {item.platform === "trendshift" && (
                  <>
                    {item.raw_data.rank !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">#{item.raw_data.rank}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "순위" : "Rank"}</p>
                      </div>
                    )}
                    {item.raw_data.stars !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.stars)}</p>
                        <p className="text-xs text-muted-foreground">Stars</p>
                      </div>
                    )}
                    {item.raw_data.forks !== undefined && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{formatNumber(item.raw_data.forks)}</p>
                        <p className="text-xs text-muted-foreground">Forks</p>
                      </div>
                    )}
                    {item.raw_data.language && (
                      <div className="rounded-lg bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">{item.raw_data.language}</p>
                        <p className="text-xs text-muted-foreground">{locale === "ko" ? "언어" : "Language"}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 작성자 정보 */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FaUser size={12} />
              {locale === "ko" ? "작성자" : "Author"}
            </h4>
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              {item.author_avatar && (
                <Image
                  src={item.author_avatar}
                  alt={item.author_name || "Author"}
                  width={40}
                  height={40}
                  className="rounded-full"
                  unoptimized
                />
              )}
              <div>
                <p className="font-medium">{item.author_name || "-"}</p>
                {item.author_url && (
                  <a
                    href={item.author_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {item.author_url}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 시간 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">
                {locale === "ko" ? "크롤링 시간" : "Crawled At"}
              </h4>
              <p className="text-sm">{formatDate(item.crawled_at)}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">
                {locale === "ko" ? "게시 시간" : "Published At"}
              </h4>
              <p className="text-sm">{formatDate(item.published_at)}</p>
            </div>
          </div>

          {/* URL */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">URL</h4>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate rounded-lg bg-muted p-3 text-sm text-primary hover:underline"
            >
              {item.url}
            </a>
          </div>

          {/* 분석 결과 (digest_result) */}
          {item.digest_result && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {locale === "ko" ? "분석 결과" : "Digest Result"}
              </h4>
              <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(item.digest_result, null, 2)}
              </pre>
            </div>
          )}

          {/* Raw Data 토글 */}
          {item.raw_data && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRawData(!showRawData)}
                className="gap-2"
              >
                <FaCode size={12} />
                {showRawData
                  ? locale === "ko"
                    ? "Raw Data 숨기기"
                    : "Hide Raw Data"
                  : locale === "ko"
                    ? "Raw Data 보기"
                    : "Show Raw Data"}
              </Button>
              {showRawData && (
                <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {JSON.stringify(item.raw_data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>
            {locale === "ko" ? "닫기" : "Close"}
          </Button>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2">
              <FaArrowUpRightFromSquare size={12} />
              {locale === "ko" ? "원본 보기" : "View Original"}
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CrawlerList({ initialContent, locale }) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [showGuide, setShowGuide] = useState(false);

  // 저장소 통합 적용 (GitHub + Trendshift)
  const groupedContent = groupByRepository(content);

  // Filter content
  const filteredContent = groupedContent.filter((item) => {
    // 통합된 항목의 경우 platforms 배열 확인
    if (selectedPlatform !== "all") {
      if (item.platforms) {
        if (!item.platforms.includes(selectedPlatform)) return false;
      } else if (item.platform !== selectedPlatform) {
        return false;
      }
    }
    if (selectedStatus !== "all" && item.status !== selectedStatus) return false;
    return true;
  });

  // Handle checkbox selection
  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredContent.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContent.map((item) => item.id)));
    }
  };

  // Get selected items
  const selectedItems = content.filter((item) => selectedIds.has(item.id));
  const hasPendingSelected = selectedItems.some((item) => item.status === "pending");

  // Refresh data
  const handleRefresh = () => {
    router.refresh();
  };

  // Update status
  const handleUpdateStatus = async (newStatus) => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("crawled_content")
        .update({ status: newStatus })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      setContent((prev) =>
        prev.map((item) =>
          selectedIds.has(item.id) ? { ...item, status: newStatus } : item
        )
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error updating status:", error);
      alert(locale === "ko" ? "상태 업데이트에 실패했습니다." : "Failed to update status.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete selected
  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("crawled_content")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      setContent((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting:", error);
      alert(locale === "ko" ? "삭제에 실패했습니다." : "Failed to delete.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Run digest
  const handleDigest = async () => {
    if (!hasPendingSelected) return;

    setIsProcessing(true);
    try {
      const pendingIds = selectedItems
        .filter((item) => item.status === "pending")
        .map((item) => item.id);

      const response = await fetch("/api/crawler/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pendingIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "API error");
      }

      const result = await response.json();
      const message = locale === "ko"
        ? `분석 완료: ${result.summary.succeeded}개 성공, ${result.summary.failed}개 실패`
        : `Analysis complete: ${result.summary.succeeded} succeeded, ${result.summary.failed} failed`;
      alert(message);
      router.refresh();
    } catch (error) {
      console.error("Error running digest:", error);
      alert(locale === "ko" ? `분석 실패: ${error.message}` : `Analysis failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setSelectedIds(new Set());
    }
  };

  // Extract content from URLs
  const handleExtract = async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/crawler/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "API error");
      }

      const result = await response.json();
      const message = locale === "ko"
        ? `본문 추출 완료: ${result.summary.succeeded}개 성공, ${result.summary.failed}개 실패`
        : `Extraction complete: ${result.summary.succeeded} succeeded, ${result.summary.failed} failed`;
      alert(message);
      router.refresh();
    } catch (error) {
      console.error("Error extracting content:", error);
      alert(locale === "ko" ? `추출 실패: ${error.message}` : `Extraction failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setSelectedIds(new Set());
    }
  };

  // Publish to content table
  const handlePublish = async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/crawler/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "API error");
      }

      const result = await response.json();
      const message = locale === "ko"
        ? `게시 완료: ${result.published}개 성공`
        : `Published: ${result.published} items`;
      alert(message);
      router.refresh();
    } catch (error) {
      console.error("Error publishing:", error);
      alert(locale === "ko" ? `게시 실패: ${error.message}` : `Publish failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setSelectedIds(new Set());
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-cera text-3xl font-bold">
            {locale === "ko" ? "크롤러" : "Crawler"}
          </h1>
          <p className="text-muted-foreground">
            {locale === "ko"
              ? `총 ${content.length}개의 크롤링된 콘텐츠`
              : `${content.length} crawled items`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGuide(true)} className="gap-2">
            <FaTerminal size={12} />
            {locale === "ko" ? "크롤링 가이드" : "Crawling Guide"}
          </Button>
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <FaRotate size={12} />
            {locale === "ko" ? "새로고침" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Platform tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                selectedPlatform === platform.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {platform.icon && <platform.icon size={14} className={platform.color} />}
              {locale === "ko" ? platform.nameKo : platform.name}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {locale === "ko" ? status.nameKo : status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="ml-auto flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-md p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={locale === "ko" ? "그리드 뷰" : "Grid view"}
          >
            <FaGrip size={14} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md p-2 transition-colors ${
              viewMode === "list"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={locale === "ko" ? "리스트 뷰" : "List view"}
          >
            <FaList size={14} />
          </button>
        </div>
      </div>

      {/* Action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted p-3">
          <span className="text-sm text-muted-foreground">
            {locale === "ko"
              ? `${selectedIds.size}개 선택됨`
              : `${selectedIds.size} selected`}
          </span>
          <div className="flex gap-2">
            {/* 분석 실행: YouTube 탭에서만 표시 */}
            {selectedPlatform === "youtube" && hasPendingSelected && (
              <Button
                size="sm"
                onClick={handleDigest}
                disabled={isProcessing}
                className="gap-2"
              >
                <FaWandMagicSparkles size={12} />
                {locale === "ko" ? "분석 실행" : "Run Digest"}
              </Button>
            )}
            {/* 게시 버튼 */}
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isProcessing}
              className="gap-2"
            >
              <FaUpload size={12} />
              {locale === "ko" ? "게시" : "Publish"}
            </Button>
            {/* 삭제 버튼 */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isProcessing}
              className="gap-2 text-destructive hover:bg-destructive/10"
            >
              <FaTrash size={12} />
              {locale === "ko" ? "삭제" : "Delete"}
            </Button>
          </div>
        </div>
      )}

      {/* LinkedIn Upload Button */}
      {selectedPlatform === "linkedin" && (
        <div className="mb-4">
          <Button variant="outline" className="gap-2">
            <FaUpload size={12} />
            {locale === "ko" ? "스크린샷 업로드" : "Upload Screenshot"}
          </Button>
        </div>
      )}

      {/* Select All */}
      <div className="mb-4 flex items-center gap-2">
        <Checkbox
          checked={selectedIds.size === filteredContent.length && filteredContent.length > 0}
          onCheckedChange={selectAll}
        />
        <span className="text-sm text-muted-foreground">
          {locale === "ko" ? "전체 선택" : "Select All"}
        </span>
      </div>

      {/* Content */}
      {filteredContent.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {locale === "ko" ? "크롤링된 콘텐츠가 없습니다." : "No crawled content found."}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredContent.map((item) => (
            <Card
              key={item.id}
              className={`group cursor-pointer overflow-hidden transition-all hover:shadow-lg ${
                selectedIds.has(item.id) ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => toggleSelect(item.id)}
            >
              {/* 썸네일 영역 */}
              <div className="relative aspect-video bg-muted">
                {/* Trendshift 배지 우선 표시 (통합된 항목 또는 Trendshift 항목) */}
                {(item.mergedRawData?.badge_url || item.raw_data?.badge_url) ? (
                  <div className="flex h-full items-center justify-center bg-white p-2">
                    <img
                      src={item.mergedRawData?.badge_url || item.raw_data?.badge_url}
                      alt="Trendshift Badge"
                      className="h-auto max-h-full w-auto max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : item.thumbnail_url ? (
                  <Image
                    src={item.thumbnail_url}
                    alt={item.title || "Thumbnail"}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                ) : item.screenshot_url ? (
                  <Image
                    src={item.screenshot_url}
                    alt={item.title || "Screenshot"}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <PlatformIcon platform={item.platform} size={48} />
                  </div>
                )}

                {/* 체크박스 오버레이 */}
                <div className="absolute left-2 top-2">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5 border-2 border-white bg-black/50 data-[state=checked]:bg-primary"
                  />
                </div>

                {/* 플랫폼 아이콘 - 통합된 경우 여러 개 표시 */}
                <div className="absolute right-2 top-2 flex gap-1">
                  {item.platforms ? (
                    item.platforms.map((p) => (
                      <div key={p} className="rounded-full bg-black/60 p-1.5">
                        <PlatformIcon platform={p} size={14} />
                      </div>
                    ))
                  ) : (
                    <div className="rounded-full bg-black/60 p-1.5">
                      <PlatformIcon platform={item.platform} size={14} />
                    </div>
                  )}
                </div>

                {/* 비디오 길이 */}
                {item.video_duration && (
                  <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
                    {item.video_duration}
                  </div>
                )}

                {/* 상태 배지 */}
                <div className="absolute bottom-2 left-2">
                  <StatusBadge status={item.status} locale={locale} />
                </div>
              </div>

              {/* 콘텐츠 정보 */}
              <CardContent className="p-3">
                {/* 제목 */}
                <h3 className="mb-1 line-clamp-2 text-sm font-medium leading-tight">
                  {item.title || (locale === "ko" ? "(제목 없음)" : "(No title)")}
                </h3>

                {/* 설명 */}
                {item.description && (
                  <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}

                {/* 작성자 및 시간 */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">
                    {item.author_name || "-"}
                  </span>
                  <span className="shrink-0 ml-2">
                    {formatTimeAgo(item.crawled_at, locale)}
                  </span>
                </div>

                {/* 액션 버튼들 */}
                <div className="mt-2 flex items-center gap-2 border-t pt-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FaArrowUpRightFromSquare size={10} />
                    {locale === "ko" ? "원본" : "Original"}
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailItem(item);
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FaEye size={10} />
                    {locale === "ko" ? "상세" : "Details"}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredContent.map((item) => (
            <Card
              key={item.id}
              className={`group cursor-pointer transition-all hover:shadow-md ${
                selectedIds.has(item.id) ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => toggleSelect(item.id)}
            >
              <CardContent className="flex items-center gap-4 p-3">
                {/* 체크박스 */}
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  onClick={(e) => e.stopPropagation()}
                />

                {/* 썸네일 */}
                <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded bg-muted">
                  {/* Trendshift 배지 우선 표시 */}
                  {(item.mergedRawData?.badge_url || item.raw_data?.badge_url) ? (
                    <div className="flex h-full items-center justify-center bg-white p-1">
                      <img
                        src={item.mergedRawData?.badge_url || item.raw_data?.badge_url}
                        alt="Trendshift Badge"
                        className="h-auto max-h-full w-auto max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  ) : item.thumbnail_url ? (
                    <Image
                      src={item.thumbnail_url}
                      alt={item.title || "Thumbnail"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : item.screenshot_url ? (
                    <Image
                      src={item.screenshot_url}
                      alt={item.title || "Screenshot"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <PlatformIcon platform={item.platform} size={24} />
                    </div>
                  )}
                  {item.video_duration && (
                    <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] text-white">
                      {item.video_duration}
                    </div>
                  )}
                </div>

                {/* 콘텐츠 정보 */}
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm font-medium">
                    {item.title || (locale === "ko" ? "(제목 없음)" : "(No title)")}
                  </h3>
                  {item.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {/* 통합된 경우 여러 플랫폼 표시 */}
                    <span className="flex items-center gap-1">
                      {item.platforms ? (
                        <>
                          {item.platforms.map((p, i) => (
                            <PlatformIcon key={p} platform={p} size={12} />
                          ))}
                          <span>{item.platforms.join(" + ")}</span>
                        </>
                      ) : (
                        <>
                          <PlatformIcon platform={item.platform} size={12} />
                          {item.platform}
                        </>
                      )}
                    </span>
                    {item.author_name && (
                      <span className="truncate">{item.author_name}</span>
                    )}
                    <span>{formatTimeAgo(item.crawled_at, locale)}</span>
                  </div>
                </div>

                {/* 상태 및 액션 */}
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={item.status} locale={locale} />
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <FaArrowUpRightFromSquare size={12} />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailItem(item);
                    }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <FaEye size={12} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === "ko" ? "콘텐츠 삭제" : "Delete Content"}
            </DialogTitle>
            <DialogDescription>
              {locale === "ko"
                ? `${selectedIds.size}개의 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
                : `Are you sure you want to delete ${selectedIds.size} items? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isProcessing}
            >
              {locale === "ko" ? "취소" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              {isProcessing ? "..." : locale === "ko" ? "삭제" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <DetailDialog
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        locale={locale}
      />

      {/* Crawling Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {locale === "ko" ? "로컬 크롤링 실행 가이드" : "Local Crawling Guide"}
            </DialogTitle>
            <DialogDescription>
              {locale === "ko"
                ? "크롤링은 로컬 터미널에서 실행해야 합니다."
                : "Crawling must be run from a local terminal."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 실행 방법 */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FaTerminal size={14} />
                {locale === "ko" ? "실행 방법" : "How to Run"}
              </h4>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-3">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    # {locale === "ko" ? "스케줄러 실행 (1.5~2.5시간 간격 자동 크롤링)" : "Run scheduler (auto-crawl every 1.5-2.5 hours)"}
                  </p>
                  <p className="text-primary">node scripts/scheduler.js</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    # {locale === "ko" ? "백그라운드 실행" : "Run in background"}
                  </p>
                  <p className="text-primary">nohup node scripts/scheduler.js &</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    # {locale === "ko" ? "PM2로 관리" : "Manage with PM2"}
                  </p>
                  <p className="text-primary">pm2 start scripts/scheduler.js</p>
                </div>
              </div>
            </div>

            {/* 크롤링 주기 */}
            <div>
              <h4 className="font-medium mb-2">
                {locale === "ko" ? "크롤링 주기" : "Crawling Intervals"}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-medium text-sm">
                    {locale === "ko" ? "실시간 (1.5~2.5시간)" : "Real-time (1.5-2.5h)"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    YouTube, Reddit, X, Threads
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-medium text-sm">
                    {locale === "ko" ? "일일 (24시간)" : "Daily (24h)"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    GitHub, Trendshift
                  </p>
                </div>
              </div>
            </div>

            {/* 환경 변수 */}
            <div>
              <h4 className="font-medium mb-2">
                {locale === "ko" ? "필요한 환경 변수" : "Required Environment Variables"}
              </h4>
              <div className="bg-muted rounded-lg p-4 font-mono text-xs space-y-1">
                <p>SUPABASE_URL=...</p>
                <p>SUPABASE_SERVICE_ROLE_KEY=...</p>
                <p>YOUTUBE_CLIENT_ID=...</p>
                <p>YOUTUBE_CLIENT_SECRET=...</p>
                <p>YOUTUBE_REFRESH_TOKEN=...</p>
              </div>
            </div>

            {/* 쿠키 설정 */}
            <div>
              <h4 className="font-medium mb-2">
                {locale === "ko" ? "X/Threads 쿠키 설정" : "X/Threads Cookie Setup"}
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                {locale === "ko"
                  ? "X와 Threads 크롤링을 위해 로그인 쿠키가 필요합니다."
                  : "Login cookies are required for X and Threads crawling."}
              </p>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-2">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    # {locale === "ko" ? "쿠키 저장 스크립트 실행" : "Run cookie save script"}
                  </p>
                  <p className="text-primary">node scripts/save-session.js x</p>
                </div>
                <div>
                  <p className="text-primary">node scripts/save-session.js threads</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGuide(false)}>
              {locale === "ko" ? "닫기" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
