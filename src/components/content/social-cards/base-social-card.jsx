"use client";

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
    name: "X",
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
}) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.x;

  return (
    <Card
      className={cn(
        "group flex flex-col overflow-hidden transition-all hover:shadow-lg",
        className
      )}
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
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <FaArrowUpRightFromSquare size={12} />
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
          <span className="text-sm text-muted-foreground">@{handle}</span>
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
  const formattedValue =
    typeof value === "number"
      ? value >= 1000000
        ? `${(value / 1000000).toFixed(1)}M`
        : value >= 1000
        ? `${(value / 1000).toFixed(1)}K`
        : value.toLocaleString()
      : value;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-sm text-muted-foreground",
        className
      )}
      title={label}
    >
      {Icon && <Icon size={14} />}
      {formattedValue}
    </span>
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
