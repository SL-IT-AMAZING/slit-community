"use client";

import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { FaCrown, FaLock } from "react-icons/fa6";

export default function PremiumGate({
  children,
  showPreview = true,
  previewContent = null,
  title,
}) {
  const { data: session } = useSession();
  const locale = useLocale();

  const isPremiumUser = session?.user?.isPremium;

  // If user is premium, show the content
  if (isPremiumUser) {
    return <>{children}</>;
  }

  // If not premium, show the gate
  return (
    <div className="relative">
      {/* Preview content (blurred) */}
      {showPreview && previewContent && (
        <div className="pointer-events-none select-none blur-sm">
          {previewContent}
        </div>
      )}

      {/* Premium Gate Overlay */}
      <Card className="absolute inset-0 flex items-center justify-center border-yellow-500/50 bg-background/95 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
            <FaCrown size={32} className="text-yellow-500" />
          </div>

          <h2 className="mb-2 text-xl font-bold">
            {locale === "ko" ? "프리미엄 콘텐츠" : "Premium Content"}
          </h2>

          {title && (
            <p className="mb-2 text-lg font-medium text-foreground">{title}</p>
          )}

          <p className="mb-6 max-w-sm text-muted-foreground">
            {locale === "ko"
              ? "이 콘텐츠는 프리미엄 구독자만 이용할 수 있습니다. 구독하고 모든 프리미엄 콘텐츠를 즐겨보세요."
              : "This content is available for premium subscribers only. Subscribe to enjoy all premium content."}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/premium">
              <Button size="lg" className="gap-2">
                <FaCrown size={16} />
                {locale === "ko" ? "프리미엄 구독하기" : "Subscribe to Premium"}
              </Button>
            </Link>

            {!session && (
              <Link href="/login">
                <Button variant="outline" size="lg">
                  {locale === "ko" ? "로그인" : "Log In"}
                </Button>
              </Link>
            )}
          </div>

          {/* Pricing hint */}
          <p className="mt-4 text-xs text-muted-foreground">
            {locale === "ko"
              ? "월 ₩9,900부터 시작 • 언제든 취소 가능"
              : "Starting at ₩9,900/month • Cancel anytime"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline premium badge component
export function PremiumBadge({ size = "default" }) {
  const locale = useLocale();

  const sizeClasses = {
    small: "px-1.5 py-0.5 text-xs gap-0.5",
    default: "px-2 py-1 text-xs gap-1",
    large: "px-3 py-1.5 text-sm gap-1.5",
  };

  const iconSizes = {
    small: 8,
    default: 10,
    large: 12,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-yellow-500 font-medium text-black ${sizeClasses[size]}`}
    >
      <FaCrown size={iconSizes[size]} />
      Premium
    </span>
  );
}

// Locked content indicator
export function LockedIndicator() {
  const locale = useLocale();

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <FaLock size={12} />
      <span>
        {locale === "ko" ? "프리미엄 전용" : "Premium only"}
      </span>
    </div>
  );
}
