"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FaCrown, FaGift } from "react-icons/fa6";

const LIMIT = 1000;

export default function PremiumEarlyAccess() {
  const locale = useLocale();
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/newsletter/count");
        const data = await res.json();
        setCount(data.count || 0);
      } catch {
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, []);

  const remaining = Math.max(0, LIMIT - (count || 0));
  const percentage = Math.min(100, ((count || 0) / LIMIT) * 100);
  const isFull = remaining === 0;

  const text = {
    ko: {
      badge: "얼리액세스",
      title: "선착순 1,000명 한정",
      benefit: "프리미엄 기능 출시 시 무료 이용권 제공",
      joined: "명 참여 중",
      remaining: "자리 남음",
      full: "마감",
    },
    en: {
      badge: "Early Access",
      title: "Limited to 1,000",
      benefit: "Free Premium access when launched",
      joined: "joined",
      remaining: "spots left",
      full: "Full",
    },
  };

  const t = text[locale] || text.en;

  if (loading) {
    return (
      <Card className="mx-auto mb-6 max-w-md animate-pulse border-2 border-dashed">
        <CardContent className="p-4">
          <div className="h-16 rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mb-6 max-w-md border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Badge variant="secondary" className="gap-1.5">
            <FaCrown className="text-yellow-500" size={12} />
            {t.badge}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {t.title}
          </span>
        </div>

        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold tabular-nums">
              {count?.toLocaleString()}{" "}
              <span className="font-normal text-muted-foreground">
                {t.joined}
              </span>
            </span>
            <span
              className={`font-semibold tabular-nums ${isFull ? "text-destructive" : "text-primary"}`}
            >
              {isFull ? t.full : `${remaining.toLocaleString()} ${t.remaining}`}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FaGift className="text-primary" size={14} />
          <span>{t.benefit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
