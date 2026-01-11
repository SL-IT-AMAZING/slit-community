"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export default function SparklineChart({
  data = [],
  dataKey = "value",
  width = 100,
  height = 30,
  strokeWidth = 1.5,
  className,
  showTrend = true,
}) {
  const { path, trend, minY, maxY } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: "", trend: 0, minY: 0, maxY: 0 };
    }

    const values = data.map((d) => (typeof d === "number" ? d : d[dataKey] || 0));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = values.map((val, i) => {
      const x = padding + (i / (values.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((val - minVal) / range) * chartHeight;
      return { x, y };
    });

    const pathD = points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(" ");

    const firstVal = values[0];
    const lastVal = values[values.length - 1];
    const trendPercent = firstVal !== 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;

    return {
      path: pathD,
      trend: trendPercent,
      minY: minVal,
      maxY: maxVal,
    };
  }, [data, dataKey, width, height]);

  if (!data || data.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center text-xs text-muted-foreground", className)}
        style={{ width, height }}
      >
        -
      </div>
    );
  }

  const isPositive = trend >= 0;
  const strokeColor = isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showTrend && (
        <span
          className={cn(
            "text-xs font-medium",
            isPositive ? "text-green-500" : "text-red-500"
          )}
        >
          {isPositive ? "+" : ""}
          {trend.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// 간단한 바 형태의 스파크라인
export function SparklineBar({
  data = [],
  dataKey = "value",
  width = 80,
  height = 24,
  barWidth = 4,
  gap = 2,
  className,
}) {
  const bars = useMemo(() => {
    if (!data || data.length === 0) return [];

    const values = data.map((d) => (typeof d === "number" ? d : d[dataKey] || 0));
    const maxVal = Math.max(...values) || 1;

    return values.slice(-10).map((val, i) => ({
      height: (val / maxVal) * height,
      value: val,
    }));
  }, [data, dataKey, height]);

  if (bars.length === 0) {
    return null;
  }

  const totalWidth = bars.length * (barWidth + gap) - gap;

  return (
    <svg width={totalWidth} height={height} className={className}>
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={i * (barWidth + gap)}
          y={height - bar.height}
          width={barWidth}
          height={bar.height}
          rx={1}
          className="fill-primary/60"
        />
      ))}
    </svg>
  );
}
