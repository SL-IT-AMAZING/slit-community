"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const RATING_COLORS = {
  5: "#fbbf24", // gold
  4: "#a3e635", // lime
  3: "#60a5fa", // blue
  2: "#fb923c", // orange
  1: "#94a3b8", // gray
};

export default function RatingDistributionChart({
  data = [], // Array of { rating: number, count: number }
  width = 280,
  height = 160,
  className,
  showLabels = true,
}) {
  const { bars, maxCount } = useMemo(() => {
    if (!data || data.length === 0) {
      return { bars: [], maxCount: 0 };
    }

    // Sort by rating descending (5 stars first)
    const sorted = [...data].sort((a, b) => b.rating - a.rating);
    const max = Math.max(...sorted.map((d) => d.count), 1);

    return {
      bars: sorted,
      maxCount: max,
    };
  }, [data]);

  if (bars.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
        style={{ width, height }}
      >
        No data available
      </div>
    );
  }

  const barHeight = 22;
  const barGap = 6;
  const labelWidth = showLabels ? 70 : 0;
  const countWidth = 36;
  const chartWidth = width - labelWidth - countWidth - 16;

  return (
    <div className={cn("flex flex-col", className)} style={{ width }}>
      <svg width={width} height={bars.length * (barHeight + barGap)}>
        {bars.map((bar, index) => {
          const y = index * (barHeight + barGap);
          const barW = Math.max((bar.count / maxCount) * chartWidth, 4);

          return (
            <g key={bar.rating}>
              {/* Star label */}
              {showLabels && (
                <g transform={`translate(0, ${y + barHeight / 2})`}>
                  {[...Array(bar.rating)].map((_, i) => (
                    <text
                      key={i}
                      x={i * 12}
                      y={0}
                      fontSize="11"
                      fill={RATING_COLORS[bar.rating]}
                      dominantBaseline="middle"
                    >
                      ★
                    </text>
                  ))}
                </g>
              )}

              {/* Bar background */}
              <rect
                x={labelWidth}
                y={y}
                width={chartWidth}
                height={barHeight}
                rx={4}
                fill="currentColor"
                className="text-muted/20"
              />

              {/* Bar foreground */}
              <rect
                x={labelWidth}
                y={y}
                width={barW}
                height={barHeight}
                rx={4}
                fill={RATING_COLORS[bar.rating]}
                className="transition-all duration-300"
              />

              {/* Count label */}
              <text
                x={labelWidth + chartWidth + 8}
                y={y + barHeight / 2}
                fontSize="12"
                fontWeight="500"
                fill="currentColor"
                dominantBaseline="middle"
                className="fill-foreground"
              >
                {bar.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
