"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * MetricsGraphModal - 상세 메트릭 그래프 모달
 *
 * @param {Array} metricsHistory - 시간별 메트릭 데이터 배열
 * @param {string} platform - 플랫폼 이름 (x, threads, reddit, youtube)
 * @param {string} title - 콘텐츠 제목
 * @param {React.ReactNode} children - 트리거 버튼/요소
 */
export default function MetricsGraphModal({
  metricsHistory = [],
  platform,
  title,
  children,
}) {
  const locale = useLocale();
  const [selectedMetric, setSelectedMetric] = useState("likes");

  // 플랫폼별 메트릭 정의
  const platformMetrics = useMemo(() => {
    switch (platform) {
      case "x":
        return [
          { key: "likes", label: locale === "ko" ? "좋아요" : "Likes", color: "#ef4444" },
          { key: "retweets", label: locale === "ko" ? "리트윗" : "Retweets", color: "#22c55e" },
          { key: "replies", label: locale === "ko" ? "답글" : "Replies", color: "#3b82f6" },
          { key: "views", label: locale === "ko" ? "조회수" : "Views", color: "#8b5cf6" },
        ];
      case "threads":
        return [
          { key: "likes", label: locale === "ko" ? "좋아요" : "Likes", color: "#ef4444" },
          { key: "reposts", label: locale === "ko" ? "리포스트" : "Reposts", color: "#22c55e" },
          { key: "replies", label: locale === "ko" ? "답글" : "Replies", color: "#3b82f6" },
          { key: "shares", label: locale === "ko" ? "보내기" : "Shares", color: "#a855f7" },
        ];
      case "reddit":
        return [
          { key: "score", label: locale === "ko" ? "점수" : "Score", color: "#f97316" },
          { key: "comments", label: locale === "ko" ? "댓글" : "Comments", color: "#3b82f6" },
        ];
      case "youtube":
        return [
          { key: "views", label: locale === "ko" ? "조회수" : "Views", color: "#ef4444" },
          { key: "likes", label: locale === "ko" ? "좋아요" : "Likes", color: "#3b82f6" },
        ];
      default:
        return [
          { key: "likes", label: locale === "ko" ? "좋아요" : "Likes", color: "#ef4444" },
        ];
    }
  }, [platform, locale]);

  // 그래프 데이터 계산
  const graphData = useMemo(() => {
    if (!metricsHistory || metricsHistory.length < 2) {
      return { path: "", points: [], minVal: 0, maxVal: 0, values: [] };
    }

    const values = metricsHistory.map((d) => d[selectedMetric] || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const width = 400;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = values.map((val, i) => {
      const x = padding + (i / (values.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((val - minVal) / range) * chartHeight;
      return { x, y, value: val, time: metricsHistory[i].recorded_at };
    });

    const pathD = points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(" ");

    return { path: pathD, points, minVal, maxVal, values };
  }, [metricsHistory, selectedMetric]);

  // 현재 선택된 메트릭의 색상
  const currentColor = platformMetrics.find((m) => m.key === selectedMetric)?.color || "#3b82f6";

  // 트렌드 계산
  const trend = useMemo(() => {
    if (graphData.values.length < 2) return 0;
    const first = graphData.values[0];
    const last = graphData.values[graphData.values.length - 1];
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [graphData.values]);

  // 시간 포맷팅
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const date = new Date(timeStr);
    return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!metricsHistory || metricsHistory.length < 2) {
    return children;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer">{children}</div>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="line-clamp-1 text-sm">
            {title || (locale === "ko" ? "메트릭 추이" : "Metrics Trend")}
          </DialogTitle>
        </DialogHeader>

        {/* Metric Selector */}
        <div className="flex flex-wrap gap-2">
          {platformMetrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedMetric === metric.key
                  ? "text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              style={{
                backgroundColor:
                  selectedMetric === metric.key ? metric.color : undefined,
              }}
            >
              {metric.label}
            </button>
          ))}
        </div>

        {/* Graph */}
        <div className="relative mt-4 rounded-lg border bg-muted/30 p-4">
          <svg width="100%" viewBox="0 0 400 200" className="overflow-visible">
            {/* Grid lines */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-muted-foreground/20"
                />
              </pattern>
            </defs>
            <rect x="40" y="40" width="320" height="120" fill="url(#grid)" />

            {/* Y-axis labels */}
            <text
              x="35"
              y="45"
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {graphData.maxVal >= 1000
                ? `${(graphData.maxVal / 1000).toFixed(1)}k`
                : graphData.maxVal}
            </text>
            <text
              x="35"
              y="160"
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {graphData.minVal >= 1000
                ? `${(graphData.minVal / 1000).toFixed(1)}k`
                : graphData.minVal}
            </text>

            {/* Line */}
            <path
              d={graphData.path}
              fill="none"
              stroke={currentColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Area under line */}
            <path
              d={`${graphData.path} L ${graphData.points[graphData.points.length - 1]?.x || 360} 160 L 40 160 Z`}
              fill={currentColor}
              fillOpacity="0.1"
            />

            {/* Data points */}
            {graphData.points.map((point, i) => (
              <g key={i}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={currentColor}
                  className="transition-all hover:r-6"
                />
                {/* Hover tooltip */}
                <title>
                  {formatTime(point.time)}: {point.value.toLocaleString()}
                </title>
              </g>
            ))}
          </svg>

          {/* Trend indicator */}
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {locale === "ko" ? "추이" : "Trend"}
            </span>
            <span
              className={cn(
                "font-medium",
                trend >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {trend >= 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Stats summary */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground">
              {locale === "ko" ? "시작" : "Start"}
            </div>
            <div className="font-semibold">
              {graphData.values[0]?.toLocaleString() || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {locale === "ko" ? "현재" : "Current"}
            </div>
            <div className="font-semibold" style={{ color: currentColor }}>
              {graphData.values[graphData.values.length - 1]?.toLocaleString() || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {locale === "ko" ? "최고" : "Peak"}
            </div>
            <div className="font-semibold">{graphData.maxVal.toLocaleString()}</div>
          </div>
        </div>

        {/* Time range */}
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(metricsHistory[0]?.recorded_at)}</span>
          <span>
            {formatTime(metricsHistory[metricsHistory.length - 1]?.recorded_at)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
