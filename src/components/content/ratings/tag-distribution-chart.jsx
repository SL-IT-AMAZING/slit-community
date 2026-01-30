"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

// Tag colors matching the 8 categories
const TAG_COLORS = {
  ui: "#3b82f6", // blue
  "vibe-coding": "#8b5cf6", // purple
  automation: "#10b981", // green
  etc: "#6b7280", // gray
  opensource: "#f59e0b", // amber
  methodology: "#ec4899", // pink
  claude: "#ef4444", // red
  "content-creation": "#06b6d4", // cyan
};

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

export default function TagDistributionChart({
  data = [], // Array of { tag: string, count: number }
  size = 180,
  innerRadius = 50,
  className,
  showLegend = true,
}) {
  const { arcs, total } = useMemo(() => {
    if (!data || data.length === 0) {
      return { arcs: [], total: 0 };
    }

    const totalCount = data.reduce((sum, d) => sum + d.count, 0);
    if (totalCount === 0) {
      return { arcs: [], total: 0 };
    }

    let currentAngle = 0;
    const arcData = data
      .filter((d) => d.count > 0)
      .map((d) => {
        const angle = (d.count / totalCount) * 360;
        const colorKey = d.tagKey || d.tag;
        const arc = {
          tag: d.tag,
          count: d.count,
          percentage: ((d.count / totalCount) * 100).toFixed(1),
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          color: TAG_COLORS[colorKey] || "#6b7280",
        };
        currentAngle += angle;
        return arc;
      });

    return { arcs: arcData, total: totalCount };
  }, [data]);

  if (arcs.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        No data available
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 8;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <svg width={size} height={size} className="overflow-visible">
        {arcs.map((arc) => {
          // For very small slices, skip rendering
          if (arc.endAngle - arc.startAngle < 1) return null;

          // Handle full circle case
          if (arc.endAngle - arc.startAngle >= 359.99) {
            return (
              <circle
                key={arc.tag}
                cx={cx}
                cy={cy}
                r={(outerRadius + innerRadius) / 2}
                fill="none"
                stroke={arc.color}
                strokeWidth={outerRadius - innerRadius}
              />
            );
          }

          const startOuter = polarToCartesian(
            cx,
            cy,
            outerRadius,
            arc.endAngle,
          );
          const endOuter = polarToCartesian(
            cx,
            cy,
            outerRadius,
            arc.startAngle,
          );
          const startInner = polarToCartesian(
            cx,
            cy,
            innerRadius,
            arc.startAngle,
          );
          const endInner = polarToCartesian(cx, cy, innerRadius, arc.endAngle);

          const largeArc = arc.endAngle - arc.startAngle > 180 ? 1 : 0;

          const d = [
            `M ${startOuter.x} ${startOuter.y}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
            `L ${startInner.x} ${startInner.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
            `Z`,
          ].join(" ");

          return (
            <path
              key={arc.tag}
              d={d}
              fill={arc.color}
              className="transition-all duration-300 hover:opacity-80"
            />
          );
        })}

        {/* Center text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="22"
          fontWeight="bold"
          className="fill-foreground"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize="11"
          className="fill-muted-foreground"
        >
          tools
        </text>
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs">
          {arcs.map((arc) => (
            <div key={arc.tag} className="flex items-center gap-1">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: arc.color }}
              />
              <span className="text-muted-foreground">{arc.tag}</span>
              <span className="font-medium">{arc.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
